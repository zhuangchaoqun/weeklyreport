import { randomUUID } from 'node:crypto';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

type PatchBody = {
  action?: unknown;
  newPassword?: unknown;
  name?: unknown;
  email?: unknown;
  studentId?: unknown;
};

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/users/[id]'>,
) {
  const admin = await requireAdmin();
  if (!admin)
    return Response.json({ error: '无管理员权限。' }, { status: 403 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as PatchBody | null;
  const target = db
    .prepare(
      `SELECT u.id,u.name,u.email,u.student_id,u.role,u.status,a.status AS approval_status FROM users u LEFT JOIN student_approvals a ON a.user_id=u.id WHERE u.id=?`,
    )
    .get(id) as
    | {
        id: string;
        name: string;
        email: string;
        student_id: string | null;
        role: string;
        status: string;
        approval_status?: string;
      }
    | undefined;
  if (!target || target.status !== 'active')
    return Response.json({ error: '账号不存在或已归档。' }, { status: 404 });
  const now = new Date().toISOString();

  if (body?.action === 'approve') {
    if (target.role !== 'student')
      return Response.json(
        { error: '待审核学生账号不存在。' },
        { status: 404 },
      );
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        `INSERT INTO student_approvals (user_id,status,requested_at,decided_at,decided_by) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,decided_at=excluded.decided_at,decided_by=excluded.decided_by`,
      ).run(id, 'approved', now, now, admin.id);
      db.prepare(
        'INSERT INTO audit_logs (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',
      ).run(randomUUID(), admin.id, 'account.approved', id, now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return Response.json({ ok: true, approvalStatus: 'approved' });
  }

  if (body?.action === 'update_profile') {
    if (target.role !== 'student')
      return Response.json(
        { error: '只能修改学生账号信息。' },
        { status: 400 },
      );
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const studentId =
      typeof body.studentId === 'string' ? body.studentId.trim() : '';
    if (name.length < 2)
      return Response.json(
        { error: '请填写至少 2 个字符的真实姓名。' },
        { status: 400 },
      );
    if (!/^\S+@\S+\.\S+$/.test(email))
      return Response.json(
        { error: '请填写有效的邮箱地址。' },
        { status: 400 },
      );
    if (!studentId)
      return Response.json(
        { error: '学生账号必须填写学号。' },
        { status: 400 },
      );
    if (
      db.prepare('SELECT 1 FROM users WHERE email=? AND id<>?').get(email, id)
    )
      return Response.json(
        { error: '该邮箱已被其他账号使用。' },
        { status: 409 },
      );
    if (
      db
        .prepare('SELECT 1 FROM users WHERE student_id=? AND id<>?')
        .get(studentId, id)
    )
      return Response.json(
        { error: '该学号已被其他学生使用。' },
        { status: 409 },
      );
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET name=?,email=?,student_id=? WHERE id=?').run(
        name,
        email,
        studentId,
        id,
      );
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
      db.prepare(
        'INSERT INTO audit_logs (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',
      ).run(randomUUID(), admin.id, 'account.profile_updated', id, now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return Response.json({ ok: true, user: { name, email, studentId } });
  }

  if (
    body?.action === 'reset_password' ||
    body?.action === 'reset_student_password'
  ) {
    const quickStudentReset = body.action === 'reset_student_password';
    if (quickStudentReset && target.role !== 'student')
      return Response.json(
        { error: '只能一键重置学生密码。' },
        { status: 400 },
      );
    const password = quickStudentReset
      ? '12345678'
      : typeof body.newPassword === 'string'
        ? body.newPassword
        : '';
    if (!quickStudentReset && password.length < 10)
      return Response.json(
        { error: '临时密码至少需要 10 位。' },
        { status: 400 },
      );
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(
        hashPassword(password),
        id,
      );
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(id);
      db.prepare(
        `INSERT INTO password_reset_requests (user_id,requested_at,status,completed_at,completed_by) VALUES (?,?,'completed',?,?) ON CONFLICT(user_id) DO UPDATE SET status='completed',completed_at=excluded.completed_at,completed_by=excluded.completed_by`,
      ).run(id, now, now, admin.id);
      db.prepare(
        'INSERT INTO audit_logs (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',
      ).run(
        randomUUID(),
        admin.id,
        quickStudentReset
          ? 'password_reset.student_default'
          : 'password_reset.admin',
        id,
        now,
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return Response.json({ ok: true });
  }
  return Response.json({ error: '不支持的账号操作。' }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/admin/users/[id]'>,
) {
  const admin = await requireAdmin();
  if (!admin)
    return Response.json({ error: '无管理员权限。' }, { status: 403 });
  const { id } = await context.params;
  if (id === admin.id)
    return Response.json(
      { error: '不能删除当前登录的管理员账号。' },
      { status: 400 },
    );
  const target = db
    .prepare('SELECT id,status FROM users WHERE id=?')
    .get(id) as { id: string; status: string } | undefined;
  if (!target || target.status !== 'active')
    return Response.json({ error: '账号不存在或已归档。' }, { status: 404 });
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      'UPDATE users SET status=?,archived_at=?,archived_by=? WHERE id=? AND status=?',
    ).run('archived', now, admin.id, id, 'active');
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
    db.prepare(
      'INSERT INTO audit_logs (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',
    ).run(randomUUID(), admin.id, 'account.archived', id, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return Response.json({ ok: true });
}
