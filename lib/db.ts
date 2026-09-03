import 'server-only';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databasePath = join(process.cwd(), 'data', process.env.BEIO_TEST_DB === '1' ? 'beio-weekly-test.sqlite' : 'beio-weekly.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });
const globalForDb = globalThis as unknown as { beioDb?: DatabaseSync };
export const db = globalForDb.beioDb ?? new DatabaseSync(databasePath);
if (process.env.NODE_ENV !== 'production') globalForDb.beioDb = db;

db.exec(`
  PRAGMA busy_timeout = 30000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE,
    student_id TEXT, role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
    password_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL, archived_at TEXT, archived_by TEXT REFERENCES users(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);
  CREATE TABLE IF NOT EXISTS student_approvals (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TEXT NOT NULL, decided_at TEXT, decided_by TEXT REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_student_approvals_status ON student_approvals(status);
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    requested_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at TEXT,
    completed_by TEXT REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status, requested_at DESC);
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL,
    target_id TEXT, detail TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'locked')),
    submitted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, period_start)
  );
  CREATE INDEX IF NOT EXISTS idx_reports_user_period ON reports(user_id, period_start DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_period_status ON reports(period_start, status);
  CREATE TABLE IF NOT EXISTS report_workflow (
    report_id TEXT PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
    returned_at TEXT,
    returned_by TEXT REFERENCES users(id),
    return_note TEXT
  );
  CREATE TABLE IF NOT EXISTS report_sections (
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY(report_id, section_key)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(report_id, section_key, author_id)
  );
  CREATE INDEX IF NOT EXISTS idx_comments_report_section ON comments(report_id, section_key);
  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attachments_report_section ON attachments(report_id, section_key);
  CREATE TABLE IF NOT EXISTS attachment_uploaders (
    attachment_id TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id, created_at DESC);
  PRAGMA optimize;
`);

export type PublicUser = { id:string; name:string; email:string; studentId:string|null; role:'student'|'admin'; status:'active'|'archived'; approvalStatus:'pending'|'approved'|'rejected'|null; createdAt:string };
export function publicUser(row: Record<string, unknown>): PublicUser {
  const role=row.role as PublicUser['role'];
  return { id:String(row.id), name:String(row.name), email:String(row.email), studentId:typeof row.student_id==='string'?row.student_id:null, role, status:row.status as PublicUser['status'], approvalStatus:role==='admin'?null:(row.approval_status as PublicUser['approvalStatus']??'pending'), createdAt:String(row.created_at) };
}
