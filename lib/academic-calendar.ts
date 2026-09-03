export type AcademicWeek = {
  year: number;
  week: number;
  start: string;
  end: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const ARCHIVE_START = '2026-01-01';

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayFor(dateText: string) {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return iso(date);
}

export function naturalWeekFromMonday(periodStart: string): AcademicWeek | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return undefined;
  const monday = new Date(`${periodStart}T00:00:00Z`);
  if (Number.isNaN(monday.getTime()) || monday.getUTCDay() !== 1) return undefined;
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const week = Math.floor((monday.getTime() - firstMonday.getTime()) / WEEK_MS) + 1;
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { year, week, start: periodStart, end: iso(sunday) };
}

export function shanghaiLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function getAcademicWeek(date = new Date()): AcademicWeek {
  const local = shanghaiLocalDate(date);
  return naturalWeekFromMonday(mondayFor(local)!)!;
}

export function getNaturalWeeks(date = new Date()) {
  const current = getAcademicWeek(date);
  const first = mondayFor(ARCHIVE_START)!;
  const start = new Date(`${first}T00:00:00Z`);
  const end = new Date(`${current.start}T00:00:00Z`);
  const count = Math.floor((end.getTime() - start.getTime()) / WEEK_MS) + 1;
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const monday = new Date(start.getTime() + index * WEEK_MS);
    return naturalWeekFromMonday(iso(monday))!;
  }).reverse();
}

export function displayDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}
