// Class Portfolio API — one Cloudflare Pages Function that routes every /api/* request.
// Bindings it needs (set in the Cloudflare dashboard, see README.md):
//   DB              D1 database       (student list + file index)
//   FILES           R2 bucket         (the actual student files)
//   TEACHER_PASSWORD  secret          (your login)
//   SESSION_SECRET    secret          (any long random string; signs login tokens)

import { SPELL_LISTS } from '../_lib/spell-lists.js';

const MAX_UPLOAD = 60 * 1024 * 1024; // 60 MB per file
const SUBJECTS = ['Maths', 'Reading', 'Writing', 'Topic', 'Inbox'];
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1
const TEACHER_TTL = 12 * 3600;
const STUDENT_TTL = 8 * 3600;
const EXTRA_MIME = new Set([
  'application/pdf', 'text/plain', 'text/markdown', 'application/json', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const INLINE_OK = (m) => /^(image|video|audio)\//.test(m) || m === 'application/pdf' || m === 'text/plain' || m === 'application/json';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Family-Token,X-Filename',
  'Access-Control-Expose-Headers': 'Content-Range,Accept-Ranges,Content-Length',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS, ...extra } });
const fail = (status, error) => json({ error }, status);

// ---------- small crypto helpers ----------
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function safeEq(secret, a, b) {
  const [x, y] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function makeToken(env, payload, ttl) {
  const body = b64u(enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl })));
  return body + '.' + b64u(await hmac(env.SESSION_SECRET, body));
}
async function readToken(env, request) {
  const h = request.headers.get('Authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [body, sig] = t.split('.');
  if (!body || !sig) return null;
  const good = b64u(await hmac(env.SESSION_SECRET, body));
  if (!(await safeEq(env.SESSION_SECRET, good, sig))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}
const randId = (n = 22) => {
  const a = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(a, (x) => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
};
const randCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- database ----------
let schemaReady = false; // a plain flag: Workers forbid sharing a promise between requests
async function ensureSchema(db) {
  if (!schemaReady) {
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, family_token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, year INTEGER, pron TEXT)'),
      db.prepare('CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT)'),
      db.prepare('CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, date TEXT NOT NULL, end_date TEXT, time TEXT, title TEXT NOT NULL, note TEXT, kind TEXT NOT NULL DEFAULT \'event\', created_at INTEGER NOT NULL)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)'),
      db.prepare('CREATE TABLE IF NOT EXISTS checks(student_id TEXT NOT NULL, k TEXT NOT NULL, status INTEGER NOT NULL, PRIMARY KEY(student_id,k))'),
      db.prepare('CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, title TEXT NOT NULL, term INTEGER, created_at INTEGER NOT NULL, visible INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_reports_student ON reports(student_id, created_at)'),
      db.prepare('CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, subject TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL, app TEXT, mime TEXT NOT NULL, size INTEGER NOT NULL, note TEXT, teacher_comment TEXT, family_visible INTEGER NOT NULL DEFAULT 1, sent_by TEXT NOT NULL, created_at INTEGER NOT NULL, meta TEXT)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_items_student ON items(student_id, subject, created_at)'),
      db.prepare('CREATE TABLE IF NOT EXISTS throttle(k TEXT PRIMARY KEY, fails INTEGER NOT NULL, until INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS mmm_progress(student_id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT \'skill\', skill INTEGER, bf_term INTEGER, bf_week INTEGER, updated_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS mmm_scores(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, kind TEXT NOT NULL, skill INTEGER, score INTEGER NOT NULL, total INTEGER, advanced INTEGER NOT NULL DEFAULT 0, term INTEGER, week INTEGER, seconds INTEGER, timed_out INTEGER, day TEXT NOT NULL, created_at INTEGER NOT NULL, sent_by TEXT NOT NULL)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_mmm_scores_student ON mmm_scores(student_id, created_at)'),
      db.prepare('CREATE TABLE IF NOT EXISTS spell_progress(student_id TEXT PRIMARY KEY, list_id TEXT NOT NULL, mastered TEXT NOT NULL DEFAULT \'[]\', carry TEXT NOT NULL DEFAULT \'[]\', words TEXT NOT NULL DEFAULT \'[]\', week_no INTEGER NOT NULL DEFAULT 1, done TEXT NOT NULL DEFAULT \'[]\', finished INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS spell_tests(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, list_id TEXT NOT NULL, week_no INTEGER NOT NULL, results TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, day TEXT, created_at INTEGER NOT NULL)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_spell_tests_student ON spell_tests(student_id, created_at)'),
      db.prepare('CREATE TABLE IF NOT EXISTS behaviour(student_id TEXT NOT NULL, kind TEXT NOT NULL, day TEXT NOT NULL, level INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(student_id,kind,day))'),
    ]);
    // profile picture columns (added later, so ALTER; a repeat run just reports the column already exists)
    for (const col of ['avatar_id TEXT', 'avatar_locked INTEGER NOT NULL DEFAULT 0']) {
      try { await db.prepare('ALTER TABLE students ADD COLUMN ' + col).run(); }
      catch (e) { if (!/duplicate column|already exists/i.test(String((e && e.message) || e))) throw e; }
    }
    schemaReady = true;
  }
}
async function locked(db, k) {
  const r = await db.prepare('SELECT until FROM throttle WHERE k=?').bind(k).first();
  return r && r.until > Date.now() ? Math.ceil((r.until - Date.now()) / 60000) : 0;
}
async function noteFail(db, k, limit) {
  const r = await db.prepare('SELECT fails FROM throttle WHERE k=?').bind(k).first();
  const fails = (r ? r.fails : 0) + 1;
  const until = fails >= limit ? Date.now() + 5 * 60000 : 0;
  await db.prepare('INSERT INTO throttle(k,fails,until) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET fails=?, until=?')
    .bind(k, until ? 0 : fails, until, until ? 0 : fails, until).run();
}
const clearFails = (db, k) => db.prepare('DELETE FROM throttle WHERE k=?').bind(k).run();

async function getSettings(db) {
  const o = {};
  for (const r of (await db.prepare('SELECT k,v FROM settings').all()).results) o[r.k] = r.v;
  return { closedAt: Number(o.closed_at) || 0, familyUntil: Number(o.family_until) || 0, showProgress: o.show_progress === '1' };
}
const setSetting = (db, k, v) => db.prepare('INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=?').bind(k, String(v), String(v)).run();
const EVENT_KINDS = ['event', 'trip', 'due', 'holiday'];
const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x + 'T00:00:00Z'));
async function calendarOut(db) {
  const rows = (await db.prepare('SELECT * FROM events ORDER BY date, time, created_at LIMIT 1500').all()).results;
  const n = {}; for (const r of (await db.prepare("SELECT k,v FROM settings WHERE k IN ('notice','notice_at','mv_n','mv_at')").all()).results) n[r.k] = r.v;
  return { events: rows.map((r) => ({ id: r.id, date: r.date, endDate: r.end_date || null, time: r.time || '', title: r.title, note: r.note || '', kind: r.kind })),
    notice: { text: n.notice || '', at: Number(n.notice_at) || 0 },
    verse: { n: Number(n.mv_n) || 0, at: Number(n.mv_at) || 0 } };
}
const classOut = (c) => ({ closed: !!c.closedAt, closedAt: c.closedAt, familyUntil: c.familyUntil, showProgress: c.showProgress });
// Reports keep private notes for the teacher; these never go to families or students.
function publicReport(r) {
  const d = safeParse(r.data) || {};
  delete d.teacherNotes; delete d.checklistSuggestions;
  return { id: r.id, title: r.title, term: r.term, createdAt: r.created_at, data: d };
}
const reportOut = (r) => ({ id: r.id, title: r.title, term: r.term, createdAt: r.created_at, visible: !!r.visible, data: safeParse(r.data) || {} });
async function visibleReports(db, sid) {
  return (await db.prepare('SELECT * FROM reports WHERE student_id=? AND visible=1 ORDER BY created_at DESC LIMIT 12').bind(sid).all()).results.map(publicReport);
}
async function checksOf(db, sid) {
  const o = {};
  for (const r of (await db.prepare('SELECT k,status FROM checks WHERE student_id=?').bind(sid).all()).results) o[r.k] = r.status;
  return o;
}

const itemOut = (r) => ({
  id: r.id, studentId: r.student_id, studentName: r.student_name, subject: r.subject, title: r.title, kind: r.kind,
  app: r.app, mime: r.mime, size: r.size, note: r.note, teacherComment: r.teacher_comment,
  familyVisible: !!r.family_visible, sentBy: r.sent_by, createdAt: r.created_at,
  meta: r.meta ? safeParse(r.meta) : null, url: '/api/f/' + r.id,
});
const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
const studentOut = (r, withSecrets) => {
  const o = { id: r.id, name: r.name, createdAt: r.created_at, year: r.year || null, pron: r.pron || null, avatar: r.avatar_id ? '/api/avatar/' + r.avatar_id : null, avatarLocked: !!r.avatar_locked };
  if (withSecrets) { o.code = r.code; o.familyToken = r.family_token; }
  return o;
};

function normSubject(s) {
  const v = String(s || '').trim().toLowerCase();
  if (/^math/.test(v)) return 'Maths';
  if (/^read/.test(v)) return 'Reading';
  if (/^writ/.test(v)) return 'Writing';
  if (/^(topic|social|science|inquiry|history)/.test(v)) return 'Topic';
  return 'Inbox';
}
function kindFromMime(m) {
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf') return 'pdf';
  if (m === 'text/plain' || m === 'text/markdown') return 'text';
  return 'file';
}
const clip = (s, n) => String(s || '').trim().slice(0, n);


// ---------- Mad Maths Minute (levels, test scores, Basic Facts attempts) ----------
const MMM_FIRST = 8, MMM_LAST = 50, MMM_PASS = 15;
const nzToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const mmmScoreOut = (r) => ({ id: r.id, kind: r.kind, skill: r.skill, score: r.score, total: r.total, advanced: !!r.advanced, term: r.term, week: r.week, seconds: r.seconds, timedOut: !!r.timed_out, day: r.day, at: r.created_at, by: r.sent_by });
async function mmmFor(db, sid) {
  const p = await db.prepare('SELECT * FROM mmm_progress WHERE student_id=?').bind(sid).first();
  const rows = (await db.prepare('SELECT * FROM mmm_scores WHERE student_id=? ORDER BY created_at DESC LIMIT 300').bind(sid).all()).results;
  return { mode: p ? p.mode : null, skill: p ? p.skill : null, term: p ? p.bf_term : null, week: p ? p.bf_week : null, scores: rows.map(mmmScoreOut) };
}
const mmmSetProgress = (db, sid, mode, skill, term, week) => db.prepare(
  'INSERT INTO mmm_progress(student_id,mode,skill,bf_term,bf_week,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET mode=?, skill=?, bf_term=?, bf_week=?, updated_at=?')
  .bind(sid, mode, skill, term, week, Date.now(), mode, skill, term, week, Date.now()).run();
const intIn = (v, lo, hi) => Number.isInteger(Number(v)) && v !== '' && v !== null && Number(v) >= lo && Number(v) <= hi ? Number(v) : null;


// ---------- Spelling (word lists, weekly 10 words, paper tests marked by the teacher) ----------
const SPELL_PER_WEEK = 10;
const spellList = (id) => SPELL_LISTS.find((l) => l.id === id);
const jparse = (t, d) => { try { const v = JSON.parse(t); return Array.isArray(v) ? v : d; } catch { return d; } };
// This week's words: missed words first (they carry over), then the next unlearned words in list order,
// and if the list is nearly finished, topped up from the start of the list.
function spellPlan(list, mastered, carry) {
  const done = new Set(mastered), out = [];
  for (const w of carry) if (list.words.includes(w) && !done.has(w) && !out.includes(w)) out.push(w);
  for (const w of list.words) { if (out.length >= SPELL_PER_WEEK) break; if (!done.has(w) && !out.includes(w)) out.push(w); }
  for (const w of list.words) { if (out.length >= SPELL_PER_WEEK) break; if (!out.includes(w)) out.push(w); }
  return out.slice(0, SPELL_PER_WEEK);
}
const spellTestOut = (r) => ({ id: r.id, listId: r.list_id, label: (spellList(r.list_id) || {}).label || r.list_id, week: r.week_no, results: jparse(r.results, []), score: r.score, total: r.total, day: r.day, at: r.created_at });
async function spellFor(db, sid) {
  const p = await db.prepare('SELECT * FROM spell_progress WHERE student_id=?').bind(sid).first();
  if (!p) return { listId: null, scores: [] };
  const l = spellList(p.list_id) || { label: p.list_id, words: [] };
  const rows = (await db.prepare('SELECT * FROM spell_tests WHERE student_id=? ORDER BY created_at DESC LIMIT 200').bind(sid).all()).results;
  return { listId: p.list_id, label: l.label, week: p.week_no, words: jparse(p.words, []), mastered: jparse(p.mastered, []).length, total: l.words.length, finished: !!p.finished, completed: jparse(p.done, []).map((id) => (spellList(id) || {}).label || id), scores: rows.map(spellTestOut) };
}
async function spellSet(db, sid, listId, startAt, keepDone) {
  const l = spellList(listId);
  const old = await db.prepare('SELECT * FROM spell_progress WHERE student_id=?').bind(sid).first();
  const mastered = l.words.slice(0, startAt), words = spellPlan(l, mastered, []);
  const done = old ? jparse(old.done, []) : [];
  await db.prepare('INSERT INTO spell_progress(student_id,list_id,mastered,carry,words,week_no,done,finished,updated_at) VALUES(?,?,?,?,?,?,?,0,?) ON CONFLICT(student_id) DO UPDATE SET list_id=?, mastered=?, carry=?, words=?, week_no=?, done=?, finished=0, updated_at=?')
    .bind(sid, listId, JSON.stringify(mastered), '[]', JSON.stringify(words), old ? old.week_no : 1, JSON.stringify(done), Date.now(), listId, JSON.stringify(mastered), '[]', JSON.stringify(words), old ? old.week_no : 1, JSON.stringify(done), Date.now()).run();
}

// ---------- router ----------
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    if (!env.DB || !env.FILES || !env.SESSION_SECRET || !env.TEACHER_PASSWORD) {
      return fail(500, 'Server not set up yet: missing ' + ['DB', 'FILES', 'SESSION_SECRET', 'TEACHER_PASSWORD'].filter((k) => !env[k]).join(', ') + '. See README.md step 5.');
    }
    await ensureSchema(env.DB);
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const m = request.method;
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const db = env.DB;
    const [a, b, c] = parts;

    if (a === 'health') return json({ ok: true });

    // ----- logins -----
    if (a === 'auth' && b === 'teacher' && m === 'POST') {
      const k = 't:' + ip;
      const mins = await locked(db, k);
      if (mins) return fail(429, `Too many tries. Wait ${mins} min.`);
      const { password } = await request.json().catch(() => ({}));
      if (!password || !(await safeEq(env.SESSION_SECRET, String(password), String(env.TEACHER_PASSWORD)))) {
        await noteFail(db, k, 8);
        return fail(401, 'Wrong password');
      }
      await clearFails(db, k);
      return json({ token: await makeToken(env, { role: 'teacher' }, TEACHER_TTL), role: 'teacher' });
    }
    if (a === 'auth' && b === 'student' && m === 'POST') {
      const k = 's:' + ip;
      const mins = await locked(db, k);
      if (mins) return fail(429, `Too many tries. Wait ${mins} min.`);
      if ((await getSettings(db)).closedAt) return fail(403, 'This class has finished for the year. Ask your teacher if you need your work.');
      const { code } = await request.json().catch(() => ({}));
      const st = cleanCode(code).length === 6 ? await db.prepare('SELECT * FROM students WHERE code=?').bind(cleanCode(code)).first() : null;
      if (!st) { await noteFail(db, k, 25); return fail(401, "That code isn't right. Check your card and try again."); }
      await clearFails(db, k);
      return json({ token: await makeToken(env, { role: 'student', sid: st.id }, STUDENT_TTL), role: 'student', student: studentOut(st) });
    }

    // ----- family (QR) — read-only, one child -----
    if (a === 'family' && m === 'GET') {
      const t = request.headers.get('X-Family-Token') || '';
      const st = t.length >= 20 ? await db.prepare('SELECT * FROM students WHERE family_token=?').bind(t).first() : null;
      if (!st) return fail(404, 'This link is no longer active. Please ask your child\'s teacher for a new QR code.');
      const cls = await getSettings(db);
      if (cls.closedAt && cls.familyUntil && Date.now() > cls.familyUntil) return json({ error: 'This class portfolio has now closed. Please contact your child\'s school if you need a copy of their work.', expired: true }, 410);
      const rows = await db.prepare('SELECT * FROM items WHERE student_id=? AND family_visible=1 ORDER BY created_at DESC').bind(st.id).all();
      return json({ student: studentOut(st), items: rows.results.map(itemOut), reports: await visibleReports(db, st.id), checks: cls.showProgress ? await checksOf(db, st.id) : null, class: classOut(cls), calendar: await calendarOut(db), behaviour: await behaviourFor(db, st.id), mmm: await mmmFor(db, st.id), spell: await spellFor(db, st.id) });
    }

    // ----- files (capability URLs: the id is a long random string) -----
    if (a === 'f' && b && m === 'GET') return serveFile(env, request, b);
    if (a === 'avatar' && b && m === 'GET') return serveAvatar(env, b);

    // ----- everything below needs a login -----
    const me = await readToken(env, request);
    if (!me) return fail(401, 'Please sign in');
    const teacher = me.role === 'teacher';
    if (!teacher && (await getSettings(db)).closedAt) return fail(403, 'This class has finished for the year.');

    if (a === 'whoami') {
      if (teacher) return json({ role: 'teacher' });
      const st = await db.prepare('SELECT * FROM students WHERE id=?').bind(me.sid).first();
      return st ? json({ role: 'student', student: studentOut(st) }) : fail(401, 'Please sign in');
    }

    if (a === 'my' && m === 'GET' && !teacher) {
      const st = await db.prepare('SELECT * FROM students WHERE id=?').bind(me.sid).first();
      if (!st) return fail(401, 'Please sign in');
      const rows = await db.prepare('SELECT * FROM items WHERE student_id=? ORDER BY created_at DESC').bind(me.sid).all();
      const cls = await getSettings(db);
      return json({ student: studentOut(st), items: rows.results.map(itemOut), reports: await visibleReports(db, st.id), checks: cls.showProgress ? await checksOf(db, st.id) : null, calendar: await calendarOut(db), behaviour: await behaviourFor(db, st.id), mmm: await mmmFor(db, st.id), spell: await spellFor(db, st.id) });
    }

    if (a === 'roster' && m === 'GET' && teacher) { // names only, for the widget's "send to…" picker
      const rows = await db.prepare('SELECT id,name FROM students ORDER BY name').all();
      return json({ students: rows.results });
    }

    // ----- Mad Maths Minute: a student saves a Basic Facts attempt -----
    if (a === 'mmm' && b === 'basic' && m === 'POST' && !teacher) {
      const pr = await db.prepare('SELECT * FROM mmm_progress WHERE student_id=?').bind(me.sid).first();
      if (!pr || pr.mode !== 'basic') return fail(403, 'Basic Facts tests open up once your teacher moves you to Basic Facts.');
      const p = await request.json().catch(() => ({}));
      const term = intIn(p.term, 1, 4), week = intIn(p.week, 1, 12), attempted = intIn(p.attempted, 0, 100), correct = intIn(p.correct, 0, 100), seconds = intIn(p.seconds, 0, 300);
      if (term === null || week === null || attempted === null || correct === null || seconds === null || correct > attempted) return fail(400, 'That result does not look right.');
      await db.prepare('INSERT INTO mmm_scores(id,student_id,kind,skill,score,total,advanced,term,week,seconds,timed_out,day,created_at,sent_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(randId(12), me.sid, 'basic', null, correct, attempted, 0, term, week, seconds, p.timedOut ? 1 : 0, nzToday(), Date.now(), 'student').run();
      return json({ mmm: await mmmFor(db, me.sid) }, 201);
    }

    if (a === 'upload' && m === 'POST') return upload(env, request, url, me);
    if (a === 'behaviour') {
      if (!teacher) return fail(403, 'Teacher only');
      if (b === 'day' && m === 'GET') {
        const day = validDay(url.searchParams.get('day')) ? url.searchParams.get('day') : nzToday();
        const studs = (await db.prepare('SELECT * FROM students ORDER BY name COLLATE NOCASE').all()).results;
        const rows = (await db.prepare('SELECT student_id, kind, level FROM behaviour WHERE day=?').bind(day).all()).results;
        const at = (sid, k) => { const r = rows.find((x) => x.student_id === sid && x.kind === k); return r ? r.level : null; };
        return json({ day, students: studs.map((st) => ({ ...studentOut(st), behaviour: at(st.id, 'behaviour'), effort: at(st.id, 'effort') })) });
      }
      if (b === 'student' && c && m === 'GET') return json({ entries: await behaviourFor(db, c) });
      if (!b && m === 'PUT') {
        const p = await request.json().catch(() => ({}));
        const day = validDay(p.day) ? p.day : nzToday();
        if (!['behaviour', 'effort'].includes(p.kind)) return fail(400, 'Unknown kind');
        if (!(await db.prepare('SELECT id FROM students WHERE id=?').bind(p.studentId).first())) return fail(400, 'Choose a student');
        if (p.level === null || p.level === undefined) { await db.prepare('DELETE FROM behaviour WHERE student_id=? AND kind=? AND day=?').bind(p.studentId, p.kind, day).run(); return json({ ok: true }); }
        const lv = Number(p.level);
        if (!Number.isInteger(lv) || lv < 1 || lv > 5) return fail(400, 'Level must be 1 to 5');
        await db.prepare('INSERT INTO behaviour(student_id,kind,day,level,created_at) VALUES(?,?,?,?,?) ON CONFLICT(student_id,kind,day) DO UPDATE SET level=excluded.level, created_at=excluded.created_at').bind(p.studentId, p.kind, day, lv, Date.now()).run();
        return json({ ok: true });
      }
    }
    if (a === 'avatar' && (m === 'POST' || m === 'PUT' || m === 'DELETE')) return avatarEdit(env, request, url, me, m);

    if (a === 'items' && b && (m === 'DELETE' || m === 'PATCH')) {
      const it = await db.prepare('SELECT * FROM items WHERE id=?').bind(b).first();
      if (!it) return fail(404, 'Not found');
      if (m === 'DELETE') {
        if (!teacher && !(it.student_id === me.sid)) return fail(403, 'Not allowed');
        await env.FILES.delete(it.student_id + '/' + it.id);
        await db.prepare('DELETE FROM items WHERE id=?').bind(b).run();
        return json({ ok: true });
      }
      if (!teacher) return fail(403, 'Teacher only');
      const p = await request.json().catch(() => ({}));
      const sets = [], vals = [];
      if ('subject' in p) { sets.push('subject=?'); vals.push(SUBJECTS.includes(p.subject) ? p.subject : 'Inbox'); }
      if ('title' in p) { sets.push('title=?'); vals.push(clip(p.title, 120) || it.title); }
      if ('teacherComment' in p) { sets.push('teacher_comment=?'); vals.push(clip(p.teacherComment, 1000) || null); }
      if ('familyVisible' in p) { sets.push('family_visible=?'); vals.push(p.familyVisible ? 1 : 0); }
      if (sets.length) await db.prepare(`UPDATE items SET ${sets.join(',')} WHERE id=?`).bind(...vals, b).run();
      const row = await db.prepare('SELECT * FROM items WHERE id=?').bind(b).first();
      return json({ item: itemOut(row) });
    }

    // ----- teacher-only below -----
    if (!teacher) return fail(403, 'Teacher only');

    if (a === 'students' && !b && m === 'GET') {
      const sts = (await db.prepare('SELECT * FROM students ORDER BY name COLLATE NOCASE').all()).results;
      const cnt = (await db.prepare('SELECT student_id, subject, COUNT(*) c, MAX(created_at) last FROM items GROUP BY student_id, subject').all()).results;
      const out = sts.map((s) => {
        const o = studentOut(s, true);
        o.counts = {}; o.last = 0; o.total = 0;
        for (const r of cnt) if (r.student_id === s.id) { o.counts[r.subject] = r.c; o.total += r.c; o.last = Math.max(o.last, r.last); }
        return o;
      });
      return json({ students: out });
    }
    if (a === 'students' && !b && m === 'POST') {
      const { names, year } = await request.json().catch(() => ({}));
      const yr = [3, 4, 5, 6, 7, 8].includes(Number(year)) ? Number(year) : null;
      const list = (Array.isArray(names) ? names : []).map((n) => clip(n, 60)).filter(Boolean).slice(0, 60);
      if (!list.length) return fail(400, 'No names given');
      const made = [];
      for (const name of list) {
        for (let tries = 0; tries < 5; tries++) {
          const s = { id: randId(10), name, code: randCode(), family_token: randId(24), created_at: Date.now(), year: yr, pron: null };
          try {
            await db.prepare('INSERT INTO students(id,name,code,family_token,created_at,year,pron) VALUES(?,?,?,?,?,?,?)').bind(s.id, s.name, s.code, s.family_token, s.created_at, s.year, null).run();
            made.push(studentOut(s, true)); break;
          } catch (e) { if (tries === 4) throw e; }
        }
      }
      return json({ students: made }, 201);
    }
    if (a === 'students' && b && m === 'PATCH') {
      const p = await request.json().catch(() => ({}));
      const st = await db.prepare('SELECT * FROM students WHERE id=?').bind(b).first();
      if (!st) return fail(404, 'Not found');
      if (p.name) await db.prepare('UPDATE students SET name=? WHERE id=?').bind(clip(p.name, 60), b).run();
      if ('year' in p) await db.prepare('UPDATE students SET year=? WHERE id=?').bind([3, 4, 5, 6, 7, 8].includes(Number(p.year)) ? Number(p.year) : null, b).run();
      if ('pron' in p) await db.prepare('UPDATE students SET pron=? WHERE id=?').bind(['he', 'she', 'they'].includes(p.pron) ? p.pron : null, b).run();
      if ('avatarLocked' in p) await db.prepare('UPDATE students SET avatar_locked=? WHERE id=?').bind(p.avatarLocked ? 1 : 0, b).run();
      if (p.regenCode) await db.prepare('UPDATE students SET code=? WHERE id=?').bind(randCode(), b).run();
      if (p.regenFamily) await db.prepare('UPDATE students SET family_token=? WHERE id=?').bind(randId(24), b).run();
      return json({ student: studentOut(await db.prepare('SELECT * FROM students WHERE id=?').bind(b).first(), true) });
    }
    if (a === 'students' && b && c === 'items' && m === 'GET') {
      const st = await db.prepare('SELECT * FROM students WHERE id=?').bind(b).first();
      if (!st) return fail(404, 'Not found');
      const rows = await db.prepare('SELECT * FROM items WHERE student_id=? ORDER BY created_at DESC').bind(b).all();
      return json({ student: studentOut(st, true), items: rows.results.map(itemOut) });
    }
    if (a === 'students' && b && m === 'DELETE') {
      const rows = (await db.prepare('SELECT id FROM items WHERE student_id=?').bind(b).all()).results;
      for (let i = 0; i < rows.length; i += 500) await env.FILES.delete(rows.slice(i, i + 500).map((r) => b + '/' + r.id));
      const av = await db.prepare('SELECT avatar_id FROM students WHERE id=?').bind(b).first();
      if (av && av.avatar_id) await env.FILES.delete('avatars/' + av.avatar_id).catch(() => {});
      await db.batch([db.prepare('DELETE FROM items WHERE student_id=?').bind(b), db.prepare('DELETE FROM checks WHERE student_id=?').bind(b), db.prepare('DELETE FROM reports WHERE student_id=?').bind(b), db.prepare('DELETE FROM behaviour WHERE student_id=?').bind(b), db.prepare('DELETE FROM mmm_progress WHERE student_id=?').bind(b), db.prepare('DELETE FROM mmm_scores WHERE student_id=?').bind(b), db.prepare('DELETE FROM spell_progress WHERE student_id=?').bind(b), db.prepare('DELETE FROM spell_tests WHERE student_id=?').bind(b), db.prepare('DELETE FROM students WHERE id=?').bind(b)]);
      return json({ ok: true, deleted: rows.length });
    }
    // ----- Mad Maths Minute (teacher) -----
    if (a === 'mmm' && b === 'class' && m === 'GET') {
      const sts = (await db.prepare('SELECT * FROM students ORDER BY name COLLATE NOCASE').all()).results;
      const prog = {}; for (const r of (await db.prepare('SELECT * FROM mmm_progress').all()).results) prog[r.student_id] = r;
      const last = {}, cnt = {};
      for (const r of (await db.prepare('SELECT * FROM mmm_scores ORDER BY created_at DESC LIMIT 3000').all()).results) {
        cnt[r.student_id] = (cnt[r.student_id] || 0) + 1;
        if (!last[r.student_id]) last[r.student_id] = mmmScoreOut(r);
      }
      return json({ students: sts.map((s) => { const p = prog[s.id]; return { id: s.id, name: s.name, year: s.year || null, mode: p ? p.mode : null, skill: p ? p.skill : null, term: p ? p.bf_term : null, week: p ? p.bf_week : null, last: last[s.id] || null, count: cnt[s.id] || 0 }; }) });
    }
    if (a === 'mmm' && b === 'students' && c && m === 'GET') {
      if (!(await db.prepare('SELECT id FROM students WHERE id=?').bind(c).first())) return fail(404, 'Not found');
      return json({ mmm: await mmmFor(db, c) });
    }
    if (a === 'mmm' && b === 'progress' && c && m === 'PUT') {
      if (!(await db.prepare('SELECT id FROM students WHERE id=?').bind(c).first())) return fail(404, 'Not found');
      const p = await request.json().catch(() => ({}));
      if (p.mode === 'basic') {
        const old = await db.prepare('SELECT * FROM mmm_progress WHERE student_id=?').bind(c).first();
        await mmmSetProgress(db, c, 'basic', old ? old.skill : null, intIn(p.term, 1, 4) || (old && old.bf_term) || 1, intIn(p.week, 1, 12) || (old && old.bf_week) || 1);
      } else if (p.mode === 'skill') {
        const sk = intIn(p.skill, MMM_FIRST, MMM_LAST);
        if (sk === null) return fail(400, 'Choose a skill from ' + MMM_FIRST + ' to ' + MMM_LAST);
        const old = await db.prepare('SELECT * FROM mmm_progress WHERE student_id=?').bind(c).first();
        await mmmSetProgress(db, c, 'skill', sk, old ? old.bf_term : null, old ? old.bf_week : null);
      } else return fail(400, 'Unknown level type');
      return json({ mmm: await mmmFor(db, c) });
    }
    if (a === 'mmm' && b === 'scores' && !c && m === 'POST') {
      const p = await request.json().catch(() => ({}));
      const sid = String(p.studentId || '');
      const pr = await db.prepare('SELECT * FROM mmm_progress WHERE student_id=?').bind(sid).first();
      if (!pr || pr.mode !== 'skill' || !pr.skill) return fail(400, 'Set this student\'s level first.');
      const score = intIn(p.score, 0, 15);
      if (score === null) return fail(400, 'A Mad Minute score is a whole number from 0 to 15.');
      const day = isDay(p.day) ? p.day : nzToday();
      const skill = pr.skill, passed = score >= MMM_PASS;
      let next = skill, toBasic = false;
      if (passed) { if (skill >= MMM_LAST) toBasic = true; else next = skill + 1; }
      await db.prepare('INSERT INTO mmm_scores(id,student_id,kind,skill,score,total,advanced,term,week,seconds,timed_out,day,created_at,sent_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(randId(12), sid, 'skill', skill, score, 15, passed ? 1 : 0, null, null, null, null, day, Date.now(), 'teacher').run();
      if (toBasic) await mmmSetProgress(db, sid, 'basic', skill, pr.bf_term || 1, pr.bf_week || 1);
      else if (passed) await mmmSetProgress(db, sid, 'skill', next, pr.bf_term, pr.bf_week);
      return json({ mmm: await mmmFor(db, sid), advanced: passed, toBasic }, 201);
    }
    // ----- Spelling (teacher) -----
    if (a === 'spell' && b === 'lists' && m === 'GET') return json({ lists: SPELL_LISTS.map((l) => ({ id: l.id, label: l.label, year: l.year, count: l.words.length })) });
    if (a === 'spell' && b === 'class' && m === 'GET') {
      const sts = (await db.prepare('SELECT * FROM students ORDER BY name COLLATE NOCASE').all()).results;
      const prog = {}; for (const r of (await db.prepare('SELECT * FROM spell_progress').all()).results) prog[r.student_id] = r;
      const last = {}; for (const r of (await db.prepare('SELECT * FROM spell_tests ORDER BY created_at DESC LIMIT 3000').all()).results) if (!last[r.student_id]) last[r.student_id] = spellTestOut(r);
      return json({ students: sts.map((s) => { const p = prog[s.id], l = p && spellList(p.list_id); return { id: s.id, name: s.name, year: s.year || null, listId: p ? p.list_id : null, label: l ? l.label : null, week: p ? p.week_no : null, words: p ? jparse(p.words, []) : [], mastered: p ? jparse(p.mastered, []).length : 0, total: l ? l.words.length : 0, finished: !!(p && p.finished), last: last[s.id] || null }; }) });
    }
    if (a === 'spell' && b === 'students' && c && m === 'GET') {
      if (!(await db.prepare('SELECT id FROM students WHERE id=?').bind(c).first())) return fail(404, 'Not found');
      return json({ spell: await spellFor(db, c) });
    }
    if (a === 'spell' && b === 'progress' && c && m === 'PUT') {
      if (!(await db.prepare('SELECT id FROM students WHERE id=?').bind(c).first())) return fail(404, 'Not found');
      const p = await request.json().catch(() => ({}));
      const l = spellList(String(p.listId || ''));
      if (!l) return fail(400, 'Choose a word list.');
      const startAt = p.startAt === undefined || p.startAt === '' ? 0 : intIn(p.startAt, 0, l.words.length - 1);
      if (startAt === null) return fail(400, 'Start-at must be between 0 and ' + (l.words.length - 1));
      await spellSet(db, c, l.id, startAt);
      return json({ spell: await spellFor(db, c) });
    }
    if (a === 'spell' && b === 'tests' && !c && m === 'POST') {
      const p = await request.json().catch(() => ({}));
      const sid = String(p.studentId || '');
      const pr = await db.prepare('SELECT * FROM spell_progress WHERE student_id=?').bind(sid).first();
      if (!pr) return fail(400, 'Choose this student\'s word list first.');
      const l = spellList(pr.list_id), words = jparse(pr.words, []);
      if (!l || !words.length) return fail(400, 'This student has no words this week.');
      const res = p.results && typeof p.results === 'object' ? p.results : {};
      for (const w of words) if (typeof res[w] !== 'boolean') return fail(400, 'Mark every word with a tick or a cross first.');
      const day = isDay(p.day) ? p.day : nzToday();
      const ok = words.filter((w) => res[w]), bad = words.filter((w) => !res[w]);
      let mastered = jparse(pr.mastered, []).filter((w) => !bad.includes(w));
      for (const w of ok) if (!mastered.includes(w)) mastered.push(w);
      let listId = pr.list_id, done = jparse(pr.done, []), finished = 0, carry = bad, advanced = false;
      if (l.words.every((w) => mastered.includes(w))) {
        done.push(l.id); advanced = true; carry = []; mastered = [];
        const i = SPELL_LISTS.findIndex((x) => x.id === l.id);
        if (i >= 0 && i < SPELL_LISTS.length - 1) listId = SPELL_LISTS[i + 1].id; else finished = 1;
      }
      const nl = spellList(listId), next = finished ? [] : spellPlan(nl, mastered, carry);
      await db.batch([
        db.prepare('INSERT INTO spell_tests(id,student_id,list_id,week_no,results,score,total,day,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(randId(12), sid, l.id, pr.week_no, JSON.stringify(words.map((w) => [w, res[w] ? 1 : 0])), ok.length, words.length, day, Date.now()),
        db.prepare('UPDATE spell_progress SET list_id=?, mastered=?, carry=?, words=?, week_no=?, done=?, finished=?, updated_at=? WHERE student_id=?').bind(listId, JSON.stringify(mastered), JSON.stringify(carry), JSON.stringify(next), pr.week_no + 1, JSON.stringify(done), finished, Date.now(), sid),
      ]);
      return json({ spell: await spellFor(db, sid), advanced, finished: !!finished }, 201);
    }
    if (a === 'spell' && b === 'tests' && c && m === 'DELETE') {
      await db.prepare('DELETE FROM spell_tests WHERE id=?').bind(c).run();
      return json({ ok: true });
    }
    if (a === 'mmm' && b === 'scores' && c && m === 'DELETE') {
      await db.prepare('DELETE FROM mmm_scores WHERE id=?').bind(c).run();
      return json({ ok: true });
    }

    // ----- calendar & notice (teacher writes, everyone reads via /my and /family) -----
    if (a === 'calendar' && !b && m === 'GET' && teacher) return json(await calendarOut(db));
    if ((a === 'events' && m === 'POST' && !b) || (a === 'events' && b && m === 'PATCH')) {
      if (!teacher) return fail(403, 'Teacher only');
      const p = await request.json().catch(() => ({}));
      const title = clip(p.title, 120), date = String(p.date || ''), end = p.endDate ? String(p.endDate) : '';
      if (!title) return fail(400, 'Please give the event a title');
      if (!isDay(date) || (end && (!isDay(end) || end < date))) return fail(400, 'Check the date');
      const kind = EVENT_KINDS.includes(p.kind) ? p.kind : 'event', time = clip(p.time, 30) || null, note = clip(p.note, 500) || null;
      if (m === 'POST') {
        const id = randId(10);
        await db.prepare('INSERT INTO events(id,date,end_date,time,title,note,kind,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id, date, end || null, time, title, note, kind, Date.now()).run();
      } else await db.prepare('UPDATE events SET date=?,end_date=?,time=?,title=?,note=?,kind=? WHERE id=?').bind(date, end || null, time, title, note, kind, b).run();
      return json(await calendarOut(db));
    }
    if (a === 'events' && b && m === 'DELETE') {
      if (!teacher) return fail(403, 'Teacher only');
      await db.prepare('DELETE FROM events WHERE id=?').bind(b).run();
      return json(await calendarOut(db));
    }
    if (a === 'verse' && m === 'PUT') {
      if (!teacher) return fail(403, 'Teacher only');
      const p = await request.json().catch(() => ({}));
      const vn = Math.trunc(Number(p.n)) || 0;
      if (vn < 0 || vn > 101) return fail(400, 'Unknown verse');
      await setSetting(db, 'mv_n', vn);
      await setSetting(db, 'mv_at', vn ? Date.now() : 0);
      return json({ n: vn, at: vn ? Date.now() : 0 });
    }
    if (a === 'notice' && m === 'PUT') {
      if (!teacher) return fail(403, 'Teacher only');
      const p = await request.json().catch(() => ({}));
      await setSetting(db, 'notice', clip(p.text, 2000) || '');
      await setSetting(db, 'notice_at', Date.now());
      return json(await calendarOut(db));
    }

    // ----- manage files: list everything / bulk delete -----
    if (a === 'files' && !b && m === 'GET') {
      const rows = (await db.prepare('SELECT * FROM items ORDER BY created_at DESC').all()).results;
      return json({ items: rows.map(itemOut) });
    }
    if (a === 'files' && b === 'delete' && m === 'POST') {
      const p = await request.json().catch(() => ({}));
      const ids = (Array.isArray(p.ids) ? p.ids : []).map(String).slice(0, 2000);
      let deleted = 0;
      for (let i = 0; i < ids.length; i += 50) {
        const part = ids.slice(i, i + 50);
        const q = part.map(() => '?').join(',');
        const rows = (await db.prepare(`SELECT id,student_id FROM items WHERE id IN (${q})`).bind(...part).all()).results;
        if (!rows.length) continue;
        await env.FILES.delete(rows.map((r) => r.student_id + '/' + r.id));
        await db.prepare(`DELETE FROM items WHERE id IN (${q})`).bind(...part).run();
        deleted += rows.length;
      }
      return json({ ok: true, deleted });
    }

    // ----- progress: checklist + reports -----
    if (a === 'students' && b && c === 'progress' && m === 'GET') {
      const st = await db.prepare('SELECT * FROM students WHERE id=?').bind(b).first();
      if (!st) return fail(404, 'Not found');
      const reps = (await db.prepare('SELECT * FROM reports WHERE student_id=? ORDER BY created_at DESC').bind(b).all()).results.map(reportOut);
      return json({ student: studentOut(st, true), checks: await checksOf(db, b), reports: reps });
    }
    if (a === 'students' && b && c === 'checks' && m === 'PUT') {
      const { changes } = await request.json().catch(() => ({}));
      const ents = Object.entries(changes || {}).slice(0, 80);
      const stmts = ents.filter(([k, v]) => k.length < 140 && Number.isInteger(v) && v >= 0 && v <= (k.startsWith('att|') ? 5 : 2))
        .map(([k, v]) => db.prepare('INSERT INTO checks(student_id,k,status) VALUES(?,?,?) ON CONFLICT(student_id,k) DO UPDATE SET status=?').bind(b, k, v, v));
      if (stmts.length) await db.batch(stmts);
      return json({ ok: true, saved: stmts.length });
    }
    if (a === 'students' && b && c === 'reports' && m === 'POST') {
      const p = await request.json().catch(() => ({}));
      const data = JSON.stringify(p.data && typeof p.data === 'object' ? p.data : {});
      if (data.length > 90000) return fail(413, 'That report is too long');
      if (data === '{}') return fail(400, 'Nothing to save');
      if (!(await db.prepare('SELECT id FROM students WHERE id=?').bind(b).first())) return fail(404, 'Not found');
      const r = { id: randId(14), student_id: b, title: clip(p.title, 120) || 'Learning summary', term: [1, 2, 3, 4].includes(Number(p.term)) ? Number(p.term) : null, created_at: Date.now(), visible: p.visible ? 1 : 0, data };
      await db.prepare('INSERT INTO reports(id,student_id,title,term,created_at,visible,data) VALUES(?,?,?,?,?,?,?)').bind(r.id, r.student_id, r.title, r.term, r.created_at, r.visible, r.data).run();
      return json({ report: reportOut(r) }, 201);
    }
    if (a === 'reports' && b && (m === 'PATCH' || m === 'DELETE')) {
      const r = await db.prepare('SELECT * FROM reports WHERE id=?').bind(b).first();
      if (!r) return fail(404, 'Not found');
      if (m === 'DELETE') { await db.prepare('DELETE FROM reports WHERE id=?').bind(b).run(); return json({ ok: true }); }
      const p = await request.json().catch(() => ({}));
      if ('visible' in p) await db.prepare('UPDATE reports SET visible=? WHERE id=?').bind(p.visible ? 1 : 0, b).run();
      if ('title' in p) await db.prepare('UPDATE reports SET title=? WHERE id=?').bind(clip(p.title, 120) || r.title, b).run();
      return json({ report: reportOut(await db.prepare('SELECT * FROM reports WHERE id=?').bind(b).first()) });
    }
    if (a === 'progress' && !b && m === 'GET') { // class overview
      const sts = (await db.prepare('SELECT * FROM students ORDER BY name COLLATE NOCASE').all()).results;
      const checks = (await db.prepare('SELECT student_id,k,status FROM checks').all()).results;
      const reps = (await db.prepare('SELECT id,student_id,title,created_at,visible,data FROM reports ORDER BY created_at DESC').all()).results;
      const cnt = (await db.prepare('SELECT student_id, subject, COUNT(*) c FROM items GROUP BY student_id, subject').all()).results;
      return json({ students: sts.map((s) => {
        const ck = {}; for (const r of checks) if (r.student_id === s.id) ck[r.k] = r.status;
        const latest = reps.find((r) => r.student_id === s.id);
        const lv = {}; const d = latest ? safeParse(latest.data) : null;
        if (d && d.subjects) for (const [k, v] of Object.entries(d.subjects)) if (v && v.level) lv[k] = String(v.level).slice(0, 40);
        const counts = {}; for (const r of cnt) if (r.student_id === s.id) counts[r.subject] = r.c;
        return { ...studentOut(s), checks: ck, counts, report: latest ? { id: latest.id, title: latest.title, createdAt: latest.created_at, visible: !!latest.visible, levels: lv } : null };
      }) });
    }

    // ----- class: close for the year / reopen / start fresh -----
    if (a === 'class' && !b && m === 'GET') return json({ class: classOut(await getSettings(db)) });
    if (a === 'class' && !b && m === 'PATCH') {
      const p = await request.json().catch(() => ({}));
      if ('showProgress' in p) await setSetting(db, 'show_progress', p.showProgress ? '1' : '0');
      if ('familyUntil' in p) await setSetting(db, 'family_until', Number(p.familyUntil) > 0 ? Number(p.familyUntil) : 0);
      return json({ class: classOut(await getSettings(db)) });
    }
    if (a === 'class' && b === 'close' && m === 'POST') {
      const p = await request.json().catch(() => ({}));
      await setSetting(db, 'closed_at', Date.now());
      await setSetting(db, 'family_until', Number(p.familyUntil) > Date.now() ? Number(p.familyUntil) : 0);
      return json({ class: classOut(await getSettings(db)) });
    }
    if (a === 'class' && b === 'reopen' && m === 'POST') {
      await db.prepare("DELETE FROM settings WHERE k IN ('closed_at','family_until')").run();
      return json({ class: classOut(await getSettings(db)) });
    }
    if (a === 'class' && b === 'reset-step' && m === 'POST') { // call repeatedly until done:true
      const { confirm } = await request.json().catch(() => ({}));
      if (confirm !== 'DELETE') return fail(400, 'Type DELETE to confirm');
      if (!(await getSettings(db)).closedAt) return fail(400, 'Close the class first');
      const rows = (await db.prepare('SELECT id, student_id FROM items LIMIT 400').all()).results;
      if (rows.length) {
        await env.FILES.delete(rows.map((r) => r.student_id + '/' + r.id));
        const st = [];
        for (let i = 0; i < rows.length; i += 90) { const ids = rows.slice(i, i + 90).map((r) => r.id); st.push(db.prepare(`DELETE FROM items WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids)); }
        await db.batch(st);
        const left = await db.prepare('SELECT COUNT(*) c FROM items').first();
        return json({ done: false, remaining: left.c });
      }
      const avs = (await db.prepare('SELECT id, avatar_id FROM students WHERE avatar_id IS NOT NULL LIMIT 100').all()).results; // profile pictures go too
      if (avs.length) {
        await env.FILES.delete(avs.map((r) => 'avatars/' + r.avatar_id));
        await db.batch(avs.map((r) => db.prepare('UPDATE students SET avatar_id=NULL WHERE id=?').bind(r.id)));
        return json({ done: false, remaining: avs.length });
      }
      await db.batch([db.prepare('DELETE FROM students'), db.prepare('DELETE FROM behaviour'), db.prepare('DELETE FROM mmm_progress'), db.prepare('DELETE FROM mmm_scores'), db.prepare('DELETE FROM spell_progress'), db.prepare('DELETE FROM spell_tests'), db.prepare('DELETE FROM checks'), db.prepare('DELETE FROM reports'), db.prepare('DELETE FROM settings'), db.prepare('DELETE FROM events'), db.prepare('DELETE FROM throttle')]);
      return json({ done: true, remaining: 0 });
    }

    if (a === 'recent' && m === 'GET') {
      const rows = await db.prepare('SELECT i.*, s.name student_name FROM items i JOIN students s ON s.id=i.student_id ORDER BY i.created_at DESC LIMIT 24').all();
      return json({ items: rows.results.map(itemOut) });
    }
    return fail(404, 'Unknown endpoint');
  } catch (e) {
    return fail(500, 'Server error: ' + (e && e.message ? e.message : e));
  }
}

// ---------- upload ----------
async function upload(env, request, url, me) {
  const db = env.DB;
  const q = url.searchParams;
  let sid = me.sid;
  if (me.role === 'teacher') {
    sid = q.get('student');
    if (!sid || !(await db.prepare('SELECT id FROM students WHERE id=?').bind(sid).first())) return fail(400, 'Choose which student this is for');
  }
  const mime = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!(/^(image|video|audio)\//.test(mime) || EXTRA_MIME.has(mime))) return fail(415, 'That file type is not supported (' + (mime || 'unknown') + ')');
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_UPLOAD) return fail(413, 'That file is too big (max 60 MB)');
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return fail(400, 'Empty file');
  if (buf.byteLength > MAX_UPLOAD) return fail(413, 'That file is too big (max 60 MB)');

  const kind = q.get('kind') === 'result' && mime === 'application/json' ? 'result' : kindFromMime(mime);
  const fname = clip(decodeURIComponent(request.headers.get('X-Filename') || ''), 120);
  const title = clip(q.get('title'), 120) || fname || { image: 'Picture', video: 'Video', audio: 'Recording', pdf: 'PDF', text: 'Text', result: 'Result' }[kind] || 'File';
  const meta = q.get('meta') && q.get('meta').length < 2000 && safeParse(q.get('meta')) ? q.get('meta') : null;
  const id = randId(22);
  await env.FILES.put(sid + '/' + id, buf, { httpMetadata: { contentType: mime } });
  const row = {
    id, student_id: sid, subject: normSubject(q.get('subject')), title, kind, app: clip(q.get('app'), 60) || null, mime, size: buf.byteLength,
    note: clip(q.get('note'), 500) || null, teacher_comment: null, family_visible: 1, sent_by: me.role, created_at: (me.role === 'teacher' && /^\d{12,14}$/.test(q.get('at') || '') && Number(q.get('at')) <= Date.now()) ? Number(q.get('at')) : Date.now(), meta,
  };
  await db.prepare('INSERT INTO items(id,student_id,subject,title,kind,app,mime,size,note,teacher_comment,family_visible,sent_by,created_at,meta) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(row.id, row.student_id, row.subject, row.title, row.kind, row.app, row.mime, row.size, row.note, null, 1, row.sent_by, row.created_at, row.meta).run();
  return json({ item: itemOut(row) }, 201);
}

// ---------- behaviour & work-ethic entries ----------
const behaviourFor = async (db, sid) => (await db.prepare('SELECT kind, level, day FROM behaviour WHERE student_id=? ORDER BY day ASC LIMIT 600').bind(sid).all()).results;
const validDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(Date.parse(d));

// ---------- profile pictures ----------
const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
async function avatarEdit(env, request, url, me, m) {
  const db = env.DB, teacher = me.role === 'teacher';
  const sid = teacher ? url.searchParams.get('student') : me.sid;
  const st = sid && (await db.prepare('SELECT * FROM students WHERE id=?').bind(sid).first());
  if (!st) return fail(400, 'Choose which student this is for');
  if (!teacher && st.avatar_locked) return fail(403, 'Your teacher has turned off profile pictures for now.');
  let newId = null;
  if (m !== 'DELETE') {
    const mime = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (!AVATAR_MIME.has(mime)) return fail(415, 'Please use a JPEG, PNG or WebP picture');
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return fail(400, 'Empty picture');
    if (buf.byteLength > 1024 * 1024) return fail(413, 'That picture is too big');
    newId = randId(24);
    await env.FILES.put('avatars/' + newId, buf, { httpMetadata: { contentType: mime } });
  }
  await db.prepare('UPDATE students SET avatar_id=? WHERE id=?').bind(newId, sid).run();
  if (st.avatar_id) await env.FILES.delete('avatars/' + st.avatar_id).catch(() => {});
  return json({ student: studentOut(await db.prepare('SELECT * FROM students WHERE id=?').bind(sid).first(), teacher) });
}
async function serveAvatar(env, id) {
  const obj = await env.FILES.get('avatars/' + id);
  if (!obj) return fail(404, 'Not found');
  return new Response(obj.body, { headers: { ...CORS, 'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' } });
}

// ---------- file download / streaming (supports Range so iPad video works) ----------
async function serveFile(env, request, id) {
  const it = await env.DB.prepare('SELECT student_id, mime, title FROM items WHERE id=?').bind(id).first();
  if (!it) return fail(404, 'Not found');
  const key = it.student_id + '/' + id;
  const rangeH = request.headers.get('Range');
  let opts, status = 200;
  const mm = rangeH && /^bytes=(\d*)-(\d*)$/.exec(rangeH);
  if (mm && (mm[1] || mm[2])) {
    status = 206;
    opts = mm[1] ? { offset: Number(mm[1]), ...(mm[2] ? { length: Number(mm[2]) - Number(mm[1]) + 1 } : {}) } : { suffix: Number(mm[2]) };
  }
  const obj = await env.FILES.get(key, opts ? { range: opts } : undefined);
  if (!obj) return fail(404, 'File missing');
  const dl = new URL(request.url).searchParams.get('dl') === '1' || !INLINE_OK(it.mime);
  const h = new Headers({
    ...CORS,
    'Content-Type': it.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Content-Disposition': (dl ? 'attachment' : 'inline') + `; filename*=UTF-8''${encodeURIComponent(it.title.replace(/[\\/:*?"<>|]/g, '_'))}`,
  });
  if (it.mime === 'image/svg+xml') h.set('Content-Security-Policy', 'sandbox');
  let len = obj.size;
  if (status === 206) {
    const r = obj.range || {};
    const off = r.offset ?? (obj.size - (r.suffix ?? 0));
    len = r.length ?? (obj.size - off);
    h.set('Content-Range', `bytes ${off}-${off + len - 1}/${obj.size}`);
  }
  h.set('Content-Length', String(len));
  return new Response(request.method === 'HEAD' ? null : obj.body, { status, headers: h });
}
