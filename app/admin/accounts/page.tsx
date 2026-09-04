'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GraduationCap,
  KeyRound,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { PublicUser } from '@/lib/db';
import { withBasePath } from '@/lib/base-path';

export default function AccountsPage() {
  type AccountUser = PublicUser & { resetRequestedAt: string | null };
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccountUser | null>(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    studentId: '',
  });
  async function load() {
    const response = await fetch(withBasePath('/api/admin/users'));
    const result = (await response.json()) as {
      error?: string;
      users?: AccountUser[];
    };
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? '读取账号失败。');
      return;
    }
    setUsers(result.users ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function approve(user: PublicUser) {
    const response = await fetch(withBasePath(`/api/admin/users/${user.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? '审批失败。');
      return;
    }
    setUsers((items) =>
      items.map((item) =>
        item.id === user.id ? { ...item, approvalStatus: 'approved' } : item,
      ),
    );
  }
  async function remove(user: PublicUser) {
    const english = document.documentElement.lang === 'en';
    if (
      !window.confirm(
        english
          ? `Remove ${user.name}'s account or request? Historical weekly reports will be retained.`
          : `确定移除 ${user.name} 的账号或申请吗？历史周报会保留。`,
      )
    )
      return;
    const response = await fetch(withBasePath(`/api/admin/users/${user.id}`), {
      method: 'DELETE',
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? '移除账号失败。');
      return;
    }
    setUsers((items) => items.filter((item) => item.id !== user.id));
  }
  async function resetPassword(user: AccountUser) {
    const english = document.documentElement.lang === 'en';
    const studentReset = user.role === 'student';
    const password = studentReset
      ? '12345678'
      : window.prompt(
          english
            ? `Set a temporary password of at least 10 characters for ${user.name}. Share it through a trusted channel.`
            : `请为 ${user.name} 设置至少 10 位临时密码。设置后请通过可信渠道告知本人。`,
        );
    if (password === null) return;
    if (!studentReset && password.length < 10) {
      setError(
        english
          ? 'The temporary password must contain at least 10 characters.'
          : '临时密码至少需要 10 位。',
      );
      return;
    }
    const response = await fetch(withBasePath(`/api/admin/users/${user.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: studentReset ? 'reset_student_password' : 'reset_password',
        newPassword: password,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? '密码重置失败。');
      return;
    }
    setError('');
    setUsers((items) =>
      items.map((item) =>
        item.id === user.id ? { ...item, resetRequestedAt: null } : item,
      ),
    );
    window.alert(
      studentReset
        ? english
          ? `${user.name}'s password has been reset to 12345678. Existing sessions have been signed out.`
          : `已将 ${user.name} 的密码重置为 12345678，该账号的其他登录状态已注销。`
        : english
          ? `${user.name}'s temporary password has been updated. Existing sessions have been signed out.`
          : `已为 ${user.name} 设置临时密码，该账号的其他登录状态已注销。`,
    );
  }
  function editStudent(user: AccountUser) {
    setEditing(user);
    setProfile({
      name: user.name,
      email: user.email,
      studentId: user.studentId ?? '',
    });
    setError('');
  }
  async function saveStudentProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const response = await fetch(
      withBasePath(`/api/admin/users/${editing.id}`),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', ...profile }),
      },
    );
    const result = (await response.json()) as {
      error?: string;
      user?: { name: string; email: string; studentId: string };
    };
    if (!response.ok || !result.user) {
      setError(result.error ?? '学生信息更新失败。');
      return;
    }
    setUsers((items) =>
      items.map((item) =>
        item.id === editing.id ? { ...item, ...result.user } : item,
      ),
    );
    setEditing(null);
    setError('');
  }
  const pending = users.filter(
    (user) => user.role === 'student' && user.approvalStatus === 'pending',
  ).length;
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-[#0b3768]"
          >
            <ArrowLeft className="size-4" />
            返回周报
          </Link>
          <div className="mr-24 flex items-center gap-2 font-bold text-[#0b3768]">
            <ShieldCheck className="size-5 text-[#68a82b]" />
            管理员 · 账号审核
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[.12em] text-[#68a82b]">
              BEIO LAB
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0b2f58]">
              注册申请与账号
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              待审核学生只有获批后才能登录和查看周报。移除账号不会删除历史记录。
            </p>
          </div>
          <Link href="/register">
            <Button variant="outline" className="rounded-xl">
              <Users />
              注册管理员
            </Button>
          </Link>
        </div>
        {pending > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#eadfb8] bg-[#fffae9] p-4 text-sm text-[#755d18]">
            <Clock3 className="size-5" />
            <b>{pending} 个学生注册申请等待审核</b>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              正在读取账号…
            </p>
          ) : users.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              暂无账号或注册申请。
            </p>
          ) : (
            users.map((user) => {
              const waiting =
                user.role === 'student' && user.approvalStatus === 'pending';
              return (
                <div
                  key={user.id}
                  className={`flex flex-wrap items-center gap-4 border-b px-5 py-4 last:border-0 ${user.resetRequestedAt ? 'bg-[#fff8e8]' : waiting ? 'bg-[#fffdf5]' : ''}`}
                >
                  <span
                    className={`grid size-10 place-items-center rounded-full ${user.role === 'admin' ? 'bg-[#edf4fb] text-[#0b5b92]' : user.resetRequestedAt ? 'bg-[#fff0c9] text-[#8a681b]' : waiting ? 'bg-[#fff1c9] text-[#8a681b]' : 'bg-[#eef6e7] text-[#4e8129]'}`}
                  >
                    {user.role === 'admin' ? (
                      <ShieldCheck className="size-5" />
                    ) : user.resetRequestedAt ? (
                      <KeyRound className="size-5" />
                    ) : waiting ? (
                      <Clock3 className="size-5" />
                    ) : (
                      <GraduationCap className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#21374c]">
                      {user.name}{' '}
                      <span
                        className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${user.resetRequestedAt ? 'bg-[#ffe8ae] text-[#7a5611]' : waiting ? 'bg-[#fff0bf] text-[#7a5d18]' : 'bg-muted text-muted-foreground'}`}
                      >
                        {user.role === 'admin'
                          ? '管理员'
                          : user.resetRequestedAt
                            ? '申请找回密码'
                            : waiting
                              ? '待审核'
                              : '已批准学生'}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {user.email}
                      {user.studentId ? ` · 学号 ${user.studentId}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user.resetRequestedAt
                      ? `申请于 ${new Date(user.resetRequestedAt).toLocaleString('zh-CN')}`
                      : `注册于 ${new Date(user.createdAt).toLocaleDateString('zh-CN')}`}
                  </p>
                  {waiting && (
                    <Button
                      size="sm"
                      onClick={() => approve(user)}
                      className="rounded-lg bg-[#5d922f]"
                    >
                      <CheckCircle2 />
                      批准进入
                    </Button>
                  )}
                  {user.role === 'student' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editStudent(user)}
                      className="rounded-lg"
                    >
                      <Pencil />
                      编辑信息
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPassword(user)}
                    className="rounded-lg"
                  >
                    <KeyRound />
                    {user.role === 'student' ? '重置为 12345678' : '重置密码'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(user)}
                    className="rounded-lg"
                  >
                    <Trash2 />
                    {waiting ? '移除申请' : '移除账号'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
        <Dialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <form onSubmit={saveStudentProfile}>
              <DialogHeader>
                <DialogTitle>修改学生信息</DialogTitle>
                <DialogDescription>
                  可修改姓名、登录邮箱和学号。修改后，该学生需要重新登录。
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold">
                  姓名
                  <Input
                    value={profile.name}
                    onChange={(event) =>
                      setProfile((item) => ({
                        ...item,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1.5"
                    placeholder="学生真实姓名"
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  邮箱
                  <Input
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((item) => ({
                        ...item,
                        email: event.target.value,
                      }))
                    }
                    className="mt-1.5"
                    placeholder="student@example.com"
                    type="email"
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  学号
                  <Input
                    value={profile.studentId}
                    onChange={(event) =>
                      setProfile((item) => ({
                        ...item,
                        studentId: event.target.value,
                      }))
                    }
                    className="mt-1.5"
                    placeholder="学生学号"
                    autoComplete="off"
                    required
                  />
                </label>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="rounded-lg bg-[#0b3768]">
                  <Save />
                  保存学生信息
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}
