import 'server-only';
import { randomUUID } from 'node:crypto';
import { getAcademicWeek, naturalWeekFromMonday, shanghaiLocalDate, type AcademicWeek } from '@/lib/academic-calendar';
import { db } from '@/lib/db';

export type ReportRow = { id:string; user_id:string; period_start:string; period_end:string; academic_year:string; semester:string; week_number:number; status:'draft'|'submitted'|'locked'; submitted_at:string|null; created_at:string; updated_at:string };

export function resolveWeek(periodStart?: string | null): AcademicWeek | undefined {
  return periodStart ? naturalWeekFromMonday(periodStart) : getAcademicWeek();
}

export function shanghaiDate(date = new Date()) {
  if(process.env.BEIO_TEST_DB==='1'&&/^\d{4}-\d{2}-\d{2}$/.test(process.env.BEIO_TEST_DATE??''))return process.env.BEIO_TEST_DATE!;
  return shanghaiLocalDate(date);
}

export function studentCanEdit(week: AcademicWeek) {
  void week;
  return true;
}

export function getReport(userId:string, periodStart:string) {
  return db.prepare('SELECT * FROM reports WHERE user_id=? AND period_start=?').get(userId,periodStart) as ReportRow|undefined;
}

export function ensureReport(userId:string, week:AcademicWeek) {
  const existing=getReport(userId,week.start);if(existing)return existing;
  const now=new Date().toISOString(),id=randomUUID();
  db.prepare(`INSERT INTO reports (id,user_id,period_start,period_end,academic_year,semester,week_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,userId,week.start,week.end,String(week.year),'自然周',week.week,'draft',now,now);
  return getReport(userId,week.start)!;
}
