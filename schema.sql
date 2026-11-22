-- Reference only: the server runs these automatically on first use (CREATE IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, family_token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, subject TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL, app TEXT, mime TEXT NOT NULL, size INTEGER NOT NULL, note TEXT, teacher_comment TEXT, family_visible INTEGER NOT NULL DEFAULT 1, sent_by TEXT NOT NULL, created_at INTEGER NOT NULL, meta TEXT);
CREATE INDEX IF NOT EXISTS idx_items_student ON items(student_id, subject, created_at);
CREATE TABLE IF NOT EXISTS throttle(k TEXT PRIMARY KEY, fails INTEGER NOT NULL, until INTEGER NOT NULL);
