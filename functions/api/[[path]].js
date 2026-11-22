// Class Portfolio API — one Cloudflare Pages Function that routes every /api/* request.
// Bindings it needs (set in the Cloudflare dashboard, see README.md):
//   DB              D1 database       (student list + file index)
//   FILES           R2 bucket         (the actual student files)
//   TEACHER_PASSWORD  secret          (your login)
//   SESSION_SECRET    secret          (any long random string; signs login tokens)

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
let schemaReady;
function ensureSchema(db) {
  if (!schemaReady) {
    schemaReady = db.batch([
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
    ]).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
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
  const n = {}; for (const r of (await db.prepare("SELECT k,v FROM settings WHERE k IN ('notice','notice_at')").all()).results) n[r.k] = r.v;
  return { events: rows.map((r) => ({ id: r.id, date: r.date, endDate: r.end_date || null, time: r.time || '', title: r.title, note: r.note || '', kind: r.kind })),
    notice: { text: n.notice || '', at: Number(n.notice_at) || 0 } };
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
  const o = { id: r.id, name: r.name, createdAt: r.created_at, year: r.year || null, pron: r.pron || null };
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
      return json({ student: studentOut(st), items: rows.results.map(itemOut), reports: await visibleReports(db, st.id), checks: cls.showProgress ? await checksOf(db, st.id) : null, class: classOut(cls), calendar: await calendarOut(db) });
    }

    // ----- files (capability URLs: the id is a long random string) -----
    if (a === 'f' && b && m === 'GET') return serveFile(env, request, b);

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
      return json({ student: studentOut(st), items: rows.results.map(itemOut), reports: await visibleReports(db, st.id), checks: cls.showProgress ? await checksOf(db, st.id) : null, calendar: await calendarOut(db) });
    }

    if (a === 'roster' && m === 'GET' && teacher) { // names only, for the widget's "send to…" picker
      const rows = await db.prepare('SELECT id,name FROM students ORDER BY name').all();
      return json({ students: rows.results });
    }

    if (a === 'upload' && m === 'POST') return upload(env, request, url, me);

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
      await db.batch([db.prepare('DELETE FROM items WHERE student_id=?').bind(b), db.prepare('DELETE FROM checks WHERE student_id=?').bind(b), db.prepare('DELETE FROM reports WHERE student_id=?').bind(b), db.prepare('DELETE FROM students WHERE id=?').bind(b)]);
      return json({ ok: true, deleted: rows.length });
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
      await db.batch([db.prepare('DELETE FROM students'), db.prepare('DELETE FROM checks'), db.prepare('DELETE FROM reports'), db.prepare('DELETE FROM settings'), db.prepare('DELETE FROM events'), db.prepare('DELETE FROM throttle')]);
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
