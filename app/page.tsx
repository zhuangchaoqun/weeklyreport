"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleHelp,
  FileText,
  GraduationCap,
  ListChecks,
  LogOut,
  MessageSquareText,
  Microscope,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { displayDate, type AcademicWeek } from "@/lib/academic-calendar";
import { withBasePath } from "@/lib/base-path";
import { reportSections, type ReportSectionId } from "@/lib/report-definitions";
import type { PublicUser } from "@/lib/db";

type Attachment = {
  id: string;
  section_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};
type WorkRow = { id: string; plan: string; completion: string; remark: string };
type ReportData = {
  viewer: PublicUser;
  student: PublicUser | null;
  students: PublicUser[];
  weeks: AcademicWeek[];
  week: AcademicWeek;
  editable: boolean;
  report: null | {
    id: string;
    status: string;
    submittedAt: string | null;
    updatedAt: string;
    returnedAt: string | null;
    returnNote: string | null;
  };
  sections: Record<string, string>;
  comments: Record<string, string>;
  attachments: Attachment[];
};

const icons: Record<Exclude<ReportSectionId, "summary">, LucideIcon> = {
  experiment: Microscope,
  blockers: CircleHelp,
  other: Paperclip,
  next: CalendarDays,
};
const textSections = reportSections.filter(
  (section) => section.id !== "summary",
);
const emptyValues = () =>
  Object.fromEntries(
    reportSections.map((section) => [section.id, ""]),
  ) as Record<ReportSectionId, string>;
const newRow = (): WorkRow => ({
  id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
  plan: "",
  completion: "",
  remark: "",
});
const initialRows = () => [newRow(), newRow(), newRow()];

function parseRows(raw: string): WorkRow[] {
  if (!raw.trim()) return initialRows();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const rows = parsed.slice(0, 30).map((item) => {
        const row = (item && typeof item === "object" ? item : {}) as Record<
          string,
          unknown
        >;
        const text = (value: unknown) =>
          typeof value === "string" ? value : "";
        return {
          id: typeof row.id === "string" ? row.id : newRow().id,
          plan: text(row.plan),
          completion: text(row.completion),
          remark: text(row.remark),
        };
      });
      return rows.length ? rows : [newRow()];
    }
  } catch {}
  return [{ ...newRow(), plan: raw }];
}

function compactDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}.${Number(day)}`;
}

export default function Home() {
  const [data, setData] = useState<ReportData | null>(null),
    [values, setValues] = useState(emptyValues),
    [workRows, setWorkRows] = useState<WorkRow[]>(initialRows),
    [comments, setComments] = useState(emptyValues),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [returnNote, setReturnNote] = useState(""),
    [error, setError] = useState("");

  async function load(periodStart?: string, studentId?: string) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (periodStart) params.set("periodStart", periodStart);
    if (studentId) params.set("studentId", studentId);
    const response = await fetch(
      withBasePath(`/api/reports/current${params.size ? `?${params}` : ""}`),
    );
    const result = (await response.json()) as ReportData & { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "读取周报失败。");
      return;
    }
    setData(result);
    setValues({ ...emptyValues(), ...result.sections });
    setWorkRows(parseRows(result.sections.summary ?? ""));
    setComments({ ...emptyValues(), ...result.comments });
    setReturnNote(result.report?.returnNote ?? "");
  }
  useEffect(() => {
    void load();
  }, []);

  const overviewComplete = workRows.some(
    (row) => row.plan.trim() || row.completion.trim() || row.remark.trim(),
  );
  const completion = useMemo(() => {
    const required = reportSections.filter((section) => section.required);
    const done = required.filter((section) =>
      section.id === "summary" ? overviewComplete : values[section.id].trim(),
    ).length;
    return Math.round((done / required.length) * 100);
  }, [overviewComplete, values]);

  async function save(
    action: "save" | "submit" | "comment" | "return" = "save",
    returnNote = "",
  ) {
    if (!data?.student) return;
    setSaving(true);
    setError("");
    const sections = { ...values, summary: JSON.stringify(workRows) };
    const response = await fetch(withBasePath("/api/reports/current"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodStart: data.week.start,
        studentId: data.student.id,
        sections,
        comments,
        action,
        returnNote,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      emailWarning?: string;
    };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "保存失败。");
      return;
    }
    if (result.emailWarning) setError(result.emailWarning);
    setMessage(
      data.viewer.role === "admin"
        ? action === "return"
          ? "周报已退回学生"
          : "导师点评已提交"
        : action === "submit"
          ? "周报已提交并锁定"
          : "草稿已保存",
    );
    window.setTimeout(() => setMessage(""), 2400);
    await load(data.week.start, data.student.id);
  }
  async function upload(sectionKey: ReportSectionId, file: File) {
    if (!data) return;
    const form = new FormData();
    form.set("periodStart", data.week.start);
    form.set("sectionKey", sectionKey);
    form.set("studentId", data.student?.id ?? "");
    form.set("file", file);
    setSaving(true);
    const response = await fetch(withBasePath("/api/reports/attachments"), {
      method: "POST",
      body: form,
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "附件上传失败。");
      return;
    }
    await load(data.week.start, data.student?.id);
  }
  async function logout() {
    await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
    window.location.href = withBasePath("/login");
  }
  function updateRow(
    id: string,
    key: keyof Pick<WorkRow, "plan" | "completion" | "remark">,
    value: string,
  ) {
    setWorkRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }

  if (loading && !data)
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        正在读取周报…
      </main>
    );
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-red-700">{error || "无法读取周报。"}</p>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-[#0b5b92]"
            href="/login"
          >
            返回登录
          </Link>
        </div>
      </main>
    );
  const advisor = data.viewer.role === "admin";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1450px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={withBasePath("/beio-mark.png")}
              alt="BEIO Lab"
              className="h-11 w-14 object-contain"
            />
            <div>
              <div className="flex items-center gap-2 text-[15px] font-bold text-[#07366c]">
                BEIO LAB <span className="h-3 w-px bg-[#68a82b]" /> 周报
              </div>
              <p className="text-[11px] tracking-[.08em] text-muted-foreground">
                建成环境智慧运维实验室
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <b className="block text-xs">{data.viewer.name}</b>
              <small className="text-[10px] text-muted-foreground">
                {advisor ? "导师 · 管理员" : "学生账号"}
              </small>
            </span>
            {advisor && (
              <Link href="/admin/accounts">
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Users />
                  账号审核
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="退出登录"
              onClick={logout}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1450px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-r bg-card/45 px-4 py-6 max-lg:border-b">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            自然周档案
          </p>
          <div className="mt-3 space-y-1 lg:max-h-[calc(100vh-145px)] lg:overflow-y-auto max-lg:flex max-lg:overflow-x-auto">
            {data.weeks.map((week) => (
              <button
                key={week.start}
                onClick={() => void load(week.start, data.student?.id)}
                className={`w-full shrink-0 rounded-xl px-3 py-2.5 text-left max-lg:w-40 ${week.start === data.week.start ? "bg-[#0b2f58] text-white" : "hover:bg-muted"}`}
              >
                <span className="block text-xs font-semibold">
                  {week.year} 年 · 第 {week.week} 周
                </span>
                <span
                  className={`mt-1 block text-[10px] ${week.start === data.week.start ? "text-white/65" : "text-muted-foreground"}`}
                >
                  {compactDate(week.start)}—{compactDate(week.end)}
                </span>
              </button>
            ))}
          </div>
          {advisor && (
            <>
              <p className="mt-7 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                查看学生
              </p>
              <div className="mt-3 space-y-1">
                {data.students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => void load(data.week.start, student.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${student.id === data.student?.id ? "bg-[#eaf3e2] font-semibold text-[#376d1b]" : "hover:bg-muted"}`}
                  >
                    {student.name}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {student.studentId}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
        <section className="min-w-0 px-4 py-8 sm:px-8 lg:px-11">
          <div className="mx-auto max-w-[980px]">
            {!data.student ? (
              <EmptyStudents />
            ) : (
              <>
                <div className="mb-7">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#4f7f27]">
                    <span className="rounded-full bg-[#edf6e4] px-2.5 py-1">
                      {data.week.year} 年 · 第 {data.week.week} 周
                    </span>
                    <span>
                      {displayDate(data.week.start)} —{" "}
                      {displayDate(data.week.end)}
                    </span>
                  </div>
                  <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-bold tracking-[-.04em] text-[#0b2f58]">
                    {advisor ? `${data.student.name}的周报` : "每周汇报"}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    学生可持续保存草稿；提交后锁定，只有导师退回后才能继续修改。
                  </p>
                </div>
                {advisor && (
                  <Info icon={MessageSquareText} title="导师点评模式">
                    每个内容块下均可填写点评，学生内容由学生本人维护。
                  </Info>
                )}
                {!advisor && data.report?.returnedAt && (
                  <Info icon={RotateCcw} title="导师已退回修改">
                    {data.report.returnNote || "请根据导师点评修改后重新提交。"}
                  </Info>
                )}
                {error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className="mb-5 rounded-2xl border bg-card p-5 shadow-sm">
                  <Progress value={completion}>
                    <ProgressLabel>内容填写进度（仅供参考）</ProgressLabel>
                    <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                      {completion}%
                    </span>
                  </Progress>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {data.report
                        ? `状态：${data.report.status === "submitted" ? "已提交" : data.report.status === "locked" ? "已锁定" : "草稿"}`
                        : "尚未开始"}
                    </span>
                    <span>
                      {data.report?.updatedAt
                        ? `最近保存：${new Date(data.report.updatedAt).toLocaleString("zh-CN")}`
                        : "所有更改都会保存在服务器"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <WorkOverview
                    rows={workRows}
                    comment={comments.summary}
                    attachments={data.attachments.filter(
                      (item) => item.section_key === "summary",
                    )}
                    editable={data.editable}
                    canUpload={data.editable || advisor}
                    advisor={advisor}
                    onChange={updateRow}
                    onAdd={() => setWorkRows((rows) => [...rows, newRow()])}
                    onDelete={(id) =>
                      setWorkRows((rows) =>
                        rows.length > 1
                          ? rows.filter((row) => row.id !== id)
                          : rows,
                      )
                    }
                    onComment={(value) =>
                      setComments((items) => ({ ...items, summary: value }))
                    }
                    onUpload={(file) => void upload("summary", file)}
                  />
                  {textSections.map((section) => (
                    <ReportSection
                      key={section.id}
                      section={section}
                      Icon={icons[section.id]}
                      value={values[section.id]}
                      comment={comments[section.id]}
                      attachments={data.attachments.filter(
                        (item) => item.section_key === section.id,
                      )}
                      editable={data.editable}
                      canUpload={data.editable || advisor}
                      advisor={advisor}
                      onValue={(value) =>
                        setValues((items) => ({
                          ...items,
                          [section.id]: value,
                        }))
                      }
                      onComment={(value) =>
                        setComments((items) => ({
                          ...items,
                          [section.id]: value,
                        }))
                      }
                      onUpload={(file) => void upload(section.id, file)}
                    />
                  ))}
                </div>
                {advisor ? (
                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-[#eef5e8] p-5">
                    <div className="min-w-[260px] flex-1">
                      <p className="font-semibold text-[#284c1a]">
                        提交导师点评
                      </p>
                      <p className="mt-1 text-xs text-[#56704a]">
                        点评和导师附件可持续修改；退回后学生即可继续修改并重新提交。
                      </p>
                      <Textarea
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                        disabled={!data.report || data.report.status === "draft"}
                        placeholder="退回说明（选填）"
                        className="mt-3 min-h-20 bg-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={
                          saving ||
                          !data.report ||
                          data.report.status === "draft"
                        }
                        onClick={() => void save("return", returnNote)}
                        className="rounded-xl"
                      >
                        <RotateCcw />
                        退回学生修改
                      </Button>
                      <Button
                        disabled={saving || !data.report}
                        onClick={() => void save("comment")}
                        className="rounded-xl bg-[#4f842c]"
                      >
                        <MessageSquareText />
                        {saving ? "正在提交…" : "提交 / 更新点评"}
                      </Button>
                    </div>
                  </div>
                ) : data.report?.status === "submitted" ? (
                  <div className="mt-6 rounded-2xl bg-[#0b2f58] p-5 text-white">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="size-5 text-[#91cf5e]" />
                      本期周报已提交并锁定
                    </div>
                    <p className="mt-1 text-xs text-white/65">
                      导师退回后，保存、修改和附件上传功能会重新开放。
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0b2f58] p-5 text-white">
                    <div>
                      <p className="font-semibold">保存草稿或正式提交</p>
                      <p className="mt-1 text-xs text-white/65">
                        草稿可持续修改；正式提交后需等待导师退回才能修改。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={!data.editable || saving}
                        onClick={() => void save("save")}
                        className="rounded-xl border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
                      >
                        <Save />
                        {saving ? "正在保存…" : "保存草稿"}
                      </Button>
                      <Button
                        disabled={!data.editable || saving}
                        onClick={() => void save("submit")}
                        className="rounded-xl bg-[#71af37]"
                      >
                        <CheckCircle2 />
                        正式提交
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      {message && (
        <output className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0b2f58] px-4 py-2 text-sm text-white shadow-xl">
          <Check className="mr-1 inline size-4" />
          {message}
        </output>
      )}
    </main>
  );
}

function WorkOverview({
  rows,
  comment,
  attachments,
  editable,
  canUpload,
  advisor,
  onChange,
  onAdd,
  onDelete,
  onComment,
  onUpload,
}: {
  rows: WorkRow[];
  comment: string;
  attachments: Attachment[];
  editable: boolean;
  canUpload: boolean;
  advisor: boolean;
  onChange: (
    id: string,
    key: "plan" | "completion" | "remark",
    value: string,
  ) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onComment: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-[0_7px_24px_rgb(11_47_88/4%)]">
      <SectionHeader
        Icon={ListChecks}
        kicker="01 · 本周工作概述"
        title="计划、完成情况与备注"
        required
      />
      <div className="border-t px-4 pb-5 pt-4 sm:px-5">
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          对完成情况及未完成的原因做具体说明。学生可根据任务数量自行增加或删除行。
        </p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[#f3f7fa] text-[#29445c]">
              <tr>
                <th className="w-12 border-r px-2 py-3 text-center">序号</th>
                <th className="w-[43%] border-r px-3 py-3">上周计划</th>
                <th className="w-[31%] border-r px-3 py-3">完成情况</th>
                <th className="px-3 py-3">备注</th>
                {editable && (
                  <th className="w-12 px-2 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="border-r px-2 py-3 text-center font-semibold text-muted-foreground">
                    {index + 1}
                  </td>
                  <TableCell
                    value={row.plan}
                    disabled={!editable}
                    placeholder="填写上周计划"
                    onChange={(value) => onChange(row.id, "plan", value)}
                  />
                  <TableCell
                    value={row.completion}
                    disabled={!editable}
                    placeholder="说明完成情况或未完成原因"
                    onChange={(value) => onChange(row.id, "completion", value)}
                  />
                  <TableCell
                    value={row.remark}
                    disabled={!editable}
                    placeholder="补充说明（选填）"
                    onChange={(value) => onChange(row.id, "remark", value)}
                  />
                  {editable && (
                    <td className="px-2 py-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={rows.length === 1}
                        aria-label={`删除第 ${index + 1} 行`}
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled={rows.length >= 30}
            className="mt-3 rounded-lg border-dashed"
          >
            <Plus />
            添加一行
          </Button>
        )}
        <AttachmentArea
          attachments={attachments}
          editable={canUpload}
          onUpload={onUpload}
        />
        <AdvisorComment
          advisor={advisor}
          comment={comment}
          onComment={onComment}
        />
      </div>
    </article>
  );
}

function TableCell({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <td className="border-r p-0">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={disabled ? "暂无内容" : placeholder}
        className="min-h-[82px] resize-y rounded-none border-0 bg-transparent p-3 leading-6 shadow-none focus-visible:ring-2 disabled:cursor-default disabled:opacity-100"
      />
    </td>
  );
}

function SectionHeader({
  Icon,
  kicker,
  title,
  required,
}: {
  Icon: LucideIcon;
  kicker: string;
  title: string;
  required: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf4fb] text-[#0b4c83]">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <span className="block text-[10px] font-bold tracking-[.12em] text-[#629b31]">
          {kicker}
        </span>
        <h2 className="text-[15px] font-semibold text-[#152f49]">
          {title}
          {required && (
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
              建议填写
            </span>
          )}
        </h2>
      </div>
    </div>
  );
}

function ReportSection({
  section,
  Icon,
  value,
  comment,
  attachments,
  editable,
  canUpload,
  advisor,
  onValue,
  onComment,
  onUpload,
}: {
  section: (typeof textSections)[number];
  Icon: LucideIcon;
  value: string;
  comment: string;
  attachments: Attachment[];
  editable: boolean;
  canUpload: boolean;
  advisor: boolean;
  onValue: (value: string) => void;
  onComment: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-[0_7px_24px_rgb(11_47_88/4%)]">
      <SectionHeader
        Icon={Icon}
        kicker={section.kicker}
        title={section.title}
        required={section.required}
      />
      <div className="border-t px-5 pb-5 pt-4">
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          {section.hint}
        </p>
        <Textarea
          value={value}
          onChange={(event) => onValue(event.target.value)}
          disabled={!editable}
          placeholder={editable ? "在这里填写本周内容…" : "本栏目暂无内容"}
          className="min-h-[132px] resize-y bg-[#fbfcfd] p-3 leading-6 disabled:cursor-default disabled:opacity-100"
        />
        {section.canAttach && (
          <AttachmentArea
            attachments={attachments}
            editable={canUpload}
            onUpload={onUpload}
          />
        )}
        <AdvisorComment
          advisor={advisor}
          comment={comment}
          onComment={onComment}
        />
      </div>
    </article>
  );
}

function AttachmentArea({
  attachments,
  editable,
  onUpload,
}: {
  attachments: Attachment[];
  editable: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Paperclip className="size-3.5" />
        附件
      </span>
      {attachments.map((file) => (
        <a
          key={file.id}
          href={withBasePath(`/api/reports/attachments/${file.id}`)}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-[#f8fafb] px-2.5 py-1.5 text-xs text-[#38536b] hover:bg-muted"
        >
          <FileText className="size-3.5 text-[#4f8a2a]" />
          {file.original_name}
        </a>
      ))}
      {editable && (
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#7f9db5] bg-[#f7fafc] px-3 py-2 text-xs font-semibold text-[#245f8b] hover:bg-[#edf5fa]">
          <UploadCloud className="size-4" />
          上传附件（单个 ≤20 MB）
          <input
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

function AdvisorComment({
  advisor,
  comment,
  onComment,
}: {
  advisor: boolean;
  comment: string;
  onComment: (value: string) => void;
}) {
  return advisor || comment ? (
    <div className="mt-4 rounded-xl border-l-[3px] border-[#68a82b] bg-[#f3f8ee] p-3.5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#3e6f20]">
        <MessageSquareText className="size-3.5" />
        导师点评
      </div>
      {advisor ? (
        <Textarea
          value={comment}
          onChange={(event) => onComment(event.target.value)}
          placeholder="留下具体、可行动的建议…"
          className="min-h-[76px] border-[#cfe0c1] bg-white/80 text-sm"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#49603b]">
          {comment}
        </p>
      )}
    </div>
  ) : null;
}
function Info({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex gap-3 rounded-2xl border border-[#cfe0ef] bg-[#f1f7fc] p-4 text-sm text-[#204d74]">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        <b>{title}</b>
        <p className="mt-0.5 text-xs leading-5 text-[#55738e]">{children}</p>
      </div>
    </div>
  );
}
function EmptyStudents() {
  return (
    <div className="rounded-3xl border bg-card p-8 text-center">
      <GraduationCap className="mx-auto size-9 text-[#68a82b]" />
      <h1 className="mt-3 text-xl font-bold text-[#0b2f58]">暂无已批准学生</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        学生提交注册申请后，请先在“账号审核”中批准。
      </p>
      <Link href="/admin/accounts">
        <Button className="mt-5 rounded-xl bg-[#07366c]">
          <BookOpen />
          前往账号审核
        </Button>
      </Link>
    </div>
  );
}
