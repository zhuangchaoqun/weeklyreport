import { randomUUID } from 'node:crypto';
import { getSessionUser } from '@/lib/auth';
import { getNaturalWeeks, type AcademicWeek } from '@/lib/academic-calendar';
import { db, publicUser, type PublicUser } from '@/lib/db';
import { reportSectionIds } from '@/lib/report-definitions';
import { ensureReport, getReport, resolveWeek } from '@/lib/report-service';

type ContentMap = Record<string, string>;
type SaveBody = {
  periodStart?: unknown;
  studentId?: unknown;
  sections?: unknown;
  comments?: unknown;
  action?: unknown;
  returnNote?: unknown;
};

function approvedStudents() {
  return (
    db
      .prepare(
        "SELECT u.*,a.status AS approval_status FROM users u JOIN student_approvals a ON a.user_id=u.id WHERE u.role='student' AND u.status='active' AND a.status='approved' ORDER BY u.name",
      )
      .all() as Record<string, unknown>[]
  ).map(publicUser);
}
export async function GET(request: Request) {
  const viewer = await getSessionUser();
  if (!viewer) return Response.json({ error: '请先登录。' }, { status: 401 });
  const url = new URL(request.url),
    week = resolveWeek(url.searchParams.get('periodStart'));
  if (!week)
    return Response.json(
      { error: '请选择有效的自然周（周一至周日）。' },
      { status: 400 },
    );
  const weeks = getNaturalWeeks(),
    students = viewer.role === 'admin' ? approvedStudents() : [];
  const studentSubmissionStatuses: Record<
    string,
    'submitted' | 'not_submitted'
  > = {};
  if (viewer.role === 'admin') {
    for (const item of students)
      studentSubmissionStatuses[item.id] = 'not_submitted';
    for (const row of db
      .prepare('SELECT user_id,status FROM reports WHERE period_start=?')
      .all(week.start) as { user_id: string; status: string }[]) {
      if (row.user_id in studentSubmissionStatuses)
        studentSubmissionStatuses[row.user_id] =
          row.status === 'submitted' || row.status === 'locked'
            ? 'submitted'
            : 'not_submitted';
    }
  }
  const requestedId = url.searchParams.get('studentId'),
    student =
      viewer.role === 'student'
        ? viewer
        : (students.find((item) => item.id === requestedId) ??
          students[0] ??
          null);
  if (!student)
    return Response.json({
      viewer,
      student: null,
      students,
      studentSubmissionStatuses,
      weeks,
      week,
      editable: false,
      sections: {},
      comments: {},
      attachments: [],
    });
  const report = getReport(student.id, week.start),
    sections: ContentMap = {},
    comments: ContentMap = {};
  let workflow:
    | { returned_at: string | null; return_note: string | null }
    | undefined;
  if (report) {
    for (const row of db
      .prepare(
        'SELECT section_key,content FROM report_sections WHERE report_id=?',
      )
      .all(report.id) as { section_key: string; content: string }[])
      sections[row.section_key] = row.content;
    for (const row of db
      .prepare(
        'SELECT section_key,content FROM comments WHERE report_id=? ORDER BY updated_at',
      )
      .all(report.id) as { section_key: string; content: string }[])
      comments[row.section_key] = row.content;
    workflow = db
      .prepare(
        'SELECT returned_at,return_note FROM report_workflow WHERE report_id=?',
      )
      .get(report.id) as
      | { returned_at: string | null; return_note: string | null }
      | undefined;
  }
  const attachments = report
    ? (db
        .prepare(
          'SELECT id,section_key,original_name,mime_type,size_bytes,uploaded_at FROM attachments WHERE report_id=? ORDER BY uploaded_at',
        )
        .all(report.id) as Record<string, unknown>[])
    : [];
  const editable =
    viewer.role === 'student' && (!report || report.status !== 'submitted');
  return Response.json({
    viewer,
    student,
    students,
    studentSubmissionStatuses,
    weeks,
    week,
    editable,
    report: report
      ? {
          id: report.id,
          status: report.status,
          submittedAt: report.submitted_at,
          updatedAt: report.updated_at,
          returnedAt: workflow?.returned_at ?? null,
          returnNote: workflow?.return_note ?? null,
        }
      : null,
    sections,
    comments,
    attachments,
  });
}

export async function PUT(request: Request) {
  const viewer = await getSessionUser();
  if (!viewer) return Response.json({ error: '请先登录。' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as SaveBody | null;
  const week = resolveWeek(
    typeof body?.periodStart === 'string' ? body.periodStart : null,
  );
  if (!week) return Response.json({ error: '自然周无效。' }, { status: 400 });
  const now = new Date().toISOString();
  if (viewer.role === 'student') {
    const existing = getReport(viewer.id, week.start);
    if (existing?.status === 'submitted')
      return Response.json(
        { error: '周报已提交，需由导师退回后才能修改。' },
        { status: 423 },
      );
    const values = (
        body?.sections && typeof body.sections === 'object' ? body.sections : {}
      ) as ContentMap,
      report = ensureReport(viewer.id, week);
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, raw] of Object.entries(values)) {
        if (!reportSectionIds.has(key)) continue;
        const content = String(raw).slice(0, 20000);
        db.prepare(
          'INSERT INTO report_sections (report_id,section_key,content,updated_at) VALUES (?,?,?,?) ON CONFLICT(report_id,section_key) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at',
        ).run(report.id, key, content, now);
      }
      const submit = body?.action === 'submit';
      db.prepare(
        'UPDATE reports SET status=?,submitted_at=CASE WHEN ? THEN ? ELSE submitted_at END,updated_at=? WHERE id=?',
      ).run(
        submit ? 'submitted' : 'draft',
        submit ? 1 : 0,
        now,
        now,
        report.id,
      );
      if (submit)
        db.prepare(
          'INSERT INTO report_workflow (report_id,returned_at,returned_by,return_note) VALUES (?,NULL,NULL,NULL) ON CONFLICT(report_id) DO UPDATE SET returned_at=NULL,returned_by=NULL,return_note=NULL',
        ).run(report.id);
      db.prepare(
        'INSERT INTO audit_logs (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',
      ).run(
        randomUUID(),
        viewer.id,
        submit ? 'report.submitted' : 'report.saved',
        report.id,
        now,
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return Response.json({
      ok: true,
      status: body?.action === 'submit' ? 'submitted' : 'draft',
      updatedAt: now,
    });
  }
  const studentId = typeof body?.studentId === 'string' ? body.studentId : '',
    student = approvedStudents().find((item) => item.id === studentId);
  if (!student)
    return Response.json({ error: '学生账号不存在。' }, { status: 404 });
  const report = getReport(studentId, week.start);
  if (!report)
    return Response.json(
      { error: '该学生本周尚未保存周报。' },
      { status: 404 },
    );
  const values = (
    body?.comments && typeof body.comments === 'object' ? body.comments : {}
  ) as ContentMap;
  const action = body?.action === 'return' ? 'return' : 'comment',
    returnNote =
      typeof body?.returnNote === 'string'
        ? body.returnNote.trim().slice(0, 1000)
        : '';
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [key, raw] of Object.entries(values)) {
      if (!reportSectionIds.has(key)) continue;
      const content = String(raw).slice(0, 5000);
      db.prepare(
        'INSERT INTO comments (id,report_id,section_key,author_id,content,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(report_id,section_key,author_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at',
      ).run(randomUUID(), report.id, key, viewer.id, content, now, now);
    }
    if (action === 'return') {
      db.prepare(
        "UPDATE reports SET status='draft',updated_at=? WHERE id=?",
      ).run(now, report.id);
      db.prepare(
        'INSERT INTO report_workflow (report_id,returned_at,returned_by,return_note) VALUES (?,?,?,?) ON CONFLICT(report_id) DO UPDATE SET returned_at=excluded.returned_at,returned_by=excluded.returned_by,return_note=excluded.return_note',
      ).run(report.id, now, viewer.id, returnNote);
    }
    db.prepare(
      'INSERT INTO audit_logs (id,actor_id,action,target_id,detail,created_at) VALUES (?,?,?,?,?,?)',
    ).run(
      randomUUID(),
      viewer.id,
      action === 'return' ? 'report.returned' : 'report.commented',
      report.id,
      returnNote || null,
      now,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return Response.json({
    ok: true,
    updatedAt: now,
    status: action === 'return' ? 'draft' : report.status,
  });
}
