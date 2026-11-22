/*!
 * Class Portfolio widget  —  add to any app with ONE line:
 *   <script src="https://YOUR-PORTFOLIO.pages.dev/sdk.js" data-subject="Maths" data-app="Whiteboard" defer></script>
 * Full guide: ADD-PORTFOLIO-TO-AN-APP.md
 */
(function () {
  'use strict';
  if (window.ClassPortfolio) return;
  var me = document.currentScript || [].slice.call(document.scripts).filter(function (s) { return /\/sdk\.js(\?|$)/.test(s.src); }).pop();
  if (!me) return;
  var BASE = new URL(me.src).origin;
  var ds = me.dataset || {};
  var SUBJECTS = ['Maths', 'Reading', 'Writing', 'Topic'];
  var O = {
    subject: ds.subject || '',
    app: ds.app || document.title || location.hostname,
    button: ds.button !== 'off',
    label: ds.label || 'Save to portfolio',
    idle: (Number(ds.idleMinutes) || 20) * 60000,
    position: ds.position || 'bottom-right',
  };
  var KEY = 'cp_sdk_session';
  var registered = [];     // outputs the host app registered
  var preset = null;       // a payload an app asked us to send
  var waiters = [];

  // ---------- session ----------
  function getSess() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s) return null;
      if (s.role === 'student' && Date.now() - (s.last || 0) > O.idle) { localStorage.removeItem(KEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  function setSess(s) { try { if (s) { s.last = Date.now(); localStorage.setItem(KEY, JSON.stringify(s)); } else localStorage.removeItem(KEY); } catch (e) {} }
  function touch() { var s = getSess(); if (s) setSess(s); }

  function call(path, opt) {
    opt = opt || {};
    var s = getSess(), h = {};
    if (s) h.Authorization = 'Bearer ' + s.token;
    if (opt.json) { h['Content-Type'] = 'application/json'; }
    return fetch(BASE + '/api/' + path, { method: opt.method || 'GET', headers: h, body: opt.json ? JSON.stringify(opt.json) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Something went wrong'); e.status = r.status; if (r.status === 401 && s) setSess(null); throw e; } return d; }); },
        function () { throw new Error("Can't reach the portfolio. Check the internet."); });
  }

  // ---------- turning things into uploadable blobs ----------
  function dataUrlToBlob(u) {
    var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream', bin = atob(p[1]), n = bin.length, a = new Uint8Array(n);
    while (n--) a[n] = bin.charCodeAt(n);
    return new Blob([a], { type: mime });
  }
  function canvasBlob(c, type, q) { return new Promise(function (res, rej) { try { c.toBlob(function (b) { b ? res(b) : rej(new Error('Could not read the drawing')); }, type, q); } catch (e) { rej(e); } }); }
  // Drawing apps often have a see-through canvas; put it on white so it looks right in the portfolio.
  function flatten(c) {
    var t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    var x = t.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, t.width, t.height); x.drawImage(c, 0, 0);
    return t;
  }
  function shrinkImage(blob, maxSide) {
    if (!/^image\/(png|jpeg|webp)$/.test(blob.type) || blob.size < 1.2e6) return Promise.resolve(blob);
    return new Promise(function (res) {
      var img = new Image(), u = URL.createObjectURL(blob);
      img.onload = function () {
        try {
          var k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { URL.revokeObjectURL(u); res(b && b.size < blob.size ? b : blob); }, 'image/jpeg', 0.88);
        } catch (e) { res(blob); }
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(blob); };
      img.src = u;
    });
  }
  // Accepts: Blob/File, canvas, data: URL string, plain text, {text}, {json}, {blob}, or an object with those plus title/subject/filename.
  function normalise(x) {
    return Promise.resolve(x).then(function (v) {
      var out = {};
      if (v && typeof v === 'object' && !(v instanceof Blob) && !(v instanceof HTMLCanvasElement)) {
        out = { title: v.title, subject: v.subject, filename: v.filename, note: v.note, meta: v.meta, kind: v.kind };
        if (v.blob || v.file) v = v.blob || v.file;
        else if (v.canvas) v = v.canvas;
        else if (v.dataUrl) v = v.dataUrl;
        else if (v.json !== undefined) { v = new Blob([JSON.stringify(v.json, null, 2)], { type: 'application/json' }); }
        else if (v.text !== undefined) v = new Blob([String(v.text)], { type: 'text/plain' });
        else throw new Error('Nothing to save');
      }
      var p;
      if (v instanceof HTMLCanvasElement) p = Promise.resolve().then(function () { return canvasBlob(ds.transparent === 'true' ? v : flatten(v), 'image/png'); });
      else if (typeof v === 'string') p = Promise.resolve(/^data:/.test(v) ? dataUrlToBlob(v) : new Blob([v], { type: 'text/plain' }));
      else if (v instanceof Blob) p = Promise.resolve(v);
      else throw new Error('Nothing to save');
      return p.then(function (b) { return shrinkImage(b, 2000); }).then(function (b) { out.blob = b; return out; });
    });
  }

  var h2cPromise;
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!h2cPromise) h2cPromise = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = function () { res(window.html2canvas); }; s.onerror = function () { h2cPromise = null; rej(new Error('Could not load the screenshot tool')); };
      document.head.appendChild(s);
    });
    return h2cPromise;
  }
  function screenshot() {
    var host = document.getElementById('class-portfolio-root');
    return loadH2C().then(function (h2c) {
      return h2c(document.documentElement, { useCORS: true, logging: false, scale: Math.min(1.5, 1600 / Math.max(innerWidth, 1)), x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, backgroundColor: '#ffffff', ignoreElements: function (el) { return el === host; } });
    }).then(function (c) { return canvasBlob(c, 'image/jpeg', 0.88); });
  }
  function bigCanvases() {
    return [].slice.call(document.querySelectorAll('canvas')).filter(function (c) { var r = c.getBoundingClientRect(); return c.width * c.height >= 60000 && r.width > 120 && r.height > 120; }).slice(0, 4);
  }

  // ---------- upload ----------
  function upload(it, studentId, onProgress) {
    var s = getSess(); if (!s) return Promise.reject(new Error('Please sign in'));
    var q = ['subject=' + encodeURIComponent(it.subject || ''), 'title=' + encodeURIComponent(it.title || ''), 'app=' + encodeURIComponent(O.app)];
    if (it.note) q.push('note=' + encodeURIComponent(it.note));
    if (it.kind === 'result') q.push('kind=result');
    if (it.meta) q.push('meta=' + encodeURIComponent(JSON.stringify(it.meta)));
    if (studentId) q.push('student=' + encodeURIComponent(studentId));
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open('POST', BASE + '/api/upload?' + q.join('&'));
      x.setRequestHeader('Authorization', 'Bearer ' + s.token);
      x.setRequestHeader('Content-Type', it.blob.type || 'application/octet-stream');
      if (it.filename) x.setRequestHeader('X-Filename', encodeURIComponent(it.filename));
      x.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = function () { var d = {}; try { d = JSON.parse(x.responseText); } catch (e) {} if (x.status < 300) { touch(); res(d.item); } else { if (x.status === 401) setSess(null); var er = new Error(d.error || 'Upload failed'); er.status = x.status; rej(er); } };
      x.onerror = function () { rej(new Error("Can't reach the portfolio. Check the internet.")); };
      x.send(it.blob);
    });
  }

  // ---------- UI (shadow DOM so the host app's CSS can't break it) ----------
  var host, root, panel, fab, ui = { src: null, blob: null, srcs: [], subject: '', students: [], busy: false };
  var CSS = ':host{all:initial}*{box-sizing:border-box}' +
    '.f{position:fixed;z-index:2147483000;bottom:16px;right:16px;display:flex;gap:8px;align-items:center;font:800 15px/1 "Avenir Next","Trebuchet MS",system-ui,sans-serif;background:#ff9a7b;color:#3b3656;border:2px solid #58517a;border-radius:12px;padding:11px 16px;box-shadow:2px 3px 0 #58517a;cursor:pointer}' +
    '.f.left{right:auto;left:16px}.f.top{bottom:auto;top:16px}.f:active{transform:translate(2px,3px);box-shadow:none}.f svg{width:18px;height:18px}' +
    '.ov{position:fixed;inset:0;z-index:2147483001;background:rgba(59,54,86,.55);display:grid;place-items:center;padding:12px;font:16px/1.45 "Avenir Next","Trebuchet MS",system-ui,sans-serif;color:#3b3656}' +
    '.p{background:#fffbf1;border:2px solid #58517a;border-radius:16px;box-shadow:4px 5px 0 rgba(59,54,86,.3);width:min(460px,100%);max-height:calc(100vh - 24px);overflow:auto;padding:18px 20px}' +
    'h2{font:700 30px/1.05 Caveat,"Patrick Hand",cursive;margin:0 0 8px;display:flex;align-items:center;gap:8px}h2 small{margin-left:auto;font:700 13px/1 system-ui;color:#6f6a8c}' +
    'label{display:block;font-weight:800;margin:12px 0 5px;font-size:14px}.sm{font-size:13px;color:#6f6a8c}.err{color:#c2321f;font-weight:700;font-size:14px;min-height:1.2em}' +
    'input[type=text],input[type=password],select,textarea{width:100%;font:inherit;color:inherit;background:#fff;border:2px solid #58517a;border-radius:10px;padding:9px 11px}textarea{min-height:60px;resize:vertical}' +
    '.code{font:800 28px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;text-align:center;text-transform:uppercase}' +
    'button{font:inherit;font-weight:800;color:#3b3656;background:#fffbf1;border:2px solid #58517a;border-radius:10px;padding:9px 16px;cursor:pointer;box-shadow:2px 3px 0 #58517a}button:active{transform:translate(2px,3px);box-shadow:none}' +
    'button.pri{background:#ff9a7b}button.g{background:#bdf0b4}button[disabled]{opacity:.5;box-shadow:none}button.link{border:0;background:none;box-shadow:none;padding:0;text-decoration:underline;font-weight:700;font-size:13px;color:#6f6a8c}' +
    '.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.row>.grow{flex:1}.tabs{display:flex;gap:8px;margin-bottom:6px}.tabs button{flex:1}.tabs button.on{background:#fff1a3}' +
    '.opt{display:flex;gap:10px;align-items:center;width:100%;text-align:left;margin:0 0 7px;box-shadow:1px 2px 0 #58517a}.opt.on{background:#bdf0b4}.opt b{font-weight:800}.opt span.d{display:block;font-weight:600;font-size:12px;color:#6f6a8c}' +
    '.chips{display:flex;gap:6px;flex-wrap:wrap}.chips button{padding:6px 13px;box-shadow:1px 2px 0 #58517a}.chips button.on{background:var(--c)}' +
    '.prev{margin:10px 0;border:2px solid #58517a;border-radius:10px;overflow:hidden;background:#2b2840;display:grid;place-items:center;min-height:70px;color:#fff;font-size:14px}.prev img,.prev video{max-width:100%;max-height:200px;display:block}' +
    '.stu{max-height:150px;overflow:auto;border:2px solid #58517a;border-radius:10px;background:#fff;padding:6px 10px}.stu label{display:flex;gap:8px;margin:3px 0;font-weight:600}' +
    '.bar{height:10px;border-radius:6px;background:#e3dff0;overflow:hidden;border:1.5px solid #58517a;margin-top:10px}.bar i{display:block;height:100%;background:#ff9a7b;width:0}' +
    '.ok{text-align:center;padding:8px 0}.ok .tick{width:64px;height:64px;border-radius:50%;background:#bdf0b4;border:2px solid #58517a;display:grid;place-items:center;margin:0 auto 8px;font-size:34px}' +
    '.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483002;background:#3b3656;color:#fff;font:700 15px/1.3 system-ui,sans-serif;padding:11px 18px;border-radius:12px;max-width:90vw}' +
    '.offer{position:fixed;z-index:2147483000;left:50%;bottom:18px;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));background:#fffbf1;border:2px solid #58517a;border-radius:14px;box-shadow:3px 4px 0 rgba(59,54,86,.3);padding:12px 14px;font:700 15px/1.35 system-ui,sans-serif;color:#3b3656;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.offer span{flex:1;min-width:180px}';
  var FOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/></svg>';
  var SC = { Maths: '#9bbcff', Reading: '#ffc6d3', Writing: '#fff1a3', Topic: '#bdf0b4' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };

  function mount() {
    if (host) return;
    host = document.createElement('div'); host.id = 'class-portfolio-root';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + CSS + '</style><div id="fab"></div><div id="layer"></div>';
    document.body.appendChild(host);
    drawFab();
  }
  function drawFab() {
    var f = $('#fab'); f.innerHTML = '';
    if (!O.button) return;
    var b = document.createElement('button'); b.className = 'f ' + (/left/.test(O.position) ? 'left ' : '') + (/top/.test(O.position) ? 'top' : '');
    b.innerHTML = FOLDER + esc(O.label); b.onclick = function () { open(); };
    f.appendChild(b);
  }
  function layer(html) { var l = $('#layer'); l.innerHTML = html ? '<div class="ov" id="ov"><div class="p" role="dialog" aria-modal="true">' + html + '</div></div>' : ''; var ov = $('#ov'); if (ov) ov.addEventListener('click', function (e) { if (e.target === ov && !ui.busy) close(); }); return l; }
  function close() { layer(''); preset = null; }
  function toast(m, ms) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = m; root.appendChild(t); setTimeout(function () { t.remove(); }, ms || 2800); }

  // ----- login -----
  function showLogin(mode, done) {
    var student = mode !== 'teacher';
    layer('<h2>' + FOLDER.replace('<svg', '<svg width="26" height="26"') + ' Save to portfolio</h2>' +
      '<div class="tabs"><button id="ts" class="' + (student ? 'on' : '') + '">I’m a student</button><button id="tt" class="' + (!student ? 'on' : '') + '">Teacher</button></div>' +
      (student ? '<label for="c">Your personal code</label><input id="c" class="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="7" placeholder="ABC-123"><div class="sm">It’s on your card.</div>'
        : '<label for="c">Teacher password</label><input id="c" type="password" autocomplete="current-password">') +
      '<div class="err" id="e" role="alert"></div><div class="row"><button class="pri grow" id="go">Continue</button><button id="cx">Cancel</button></div>');
    var c = $('#c'); c.focus();
    if (student) c.addEventListener('input', function () { var v = c.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); c.value = v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v; });
    $('#ts').onclick = function () { showLogin('student', done); }; $('#tt').onclick = function () { showLogin('teacher', done); };
    $('#cx').onclick = function () { close(); waiters.splice(0).forEach(function (w) { w.rej(new Error('cancelled')); }); };
    function go() {
      var b = $('#go'); b.disabled = true; $('#e').textContent = '';
      call('auth/' + (student ? 'student' : 'teacher'), { method: 'POST', json: student ? { code: c.value } : { password: c.value } }).then(function (d) {
        setSess({ token: d.token, role: d.role, name: d.student ? d.student.name : '', sid: d.student ? d.student.id : '' });
        done();
      }, function (e) { b.disabled = false; $('#e').textContent = e.message; });
    }
    $('#go').onclick = go; c.onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }
  function ensureLogin() {
    return new Promise(function (res, rej) {
      mount();
      if (getSess()) return res(getSess());
      waiters.push({ res: res, rej: rej });
      showLogin('student', function () { var s = getSess(); layer(''); waiters.splice(0).forEach(function (w) { w.res(s); }); });
    });
  }

  // ----- compose -----
  function srcList() {
    var l = [];
    if (preset) l.push({ id: 'preset', label: preset.title || 'Your result', desc: 'From this app', get: function () { return preset; } });
    registered.forEach(function (r) { l.push({ id: 'r:' + r.id, label: r.label, desc: r.description || 'From this app', get: r.get }); });
    bigCanvases().forEach(function (c, i, a) { l.push({ id: 'cv' + i, label: a.length > 1 ? 'Drawing ' + (i + 1) : 'My drawing', desc: 'The picture on the screen', get: function () { return c; } }); });
    l.push({ id: 'shot', label: 'Picture of this screen', desc: 'A screenshot of what you see now', get: screenshot });
    l.push({ id: 'file', label: 'Choose a photo, video or file…', desc: 'From the iPad or computer', file: true });
    return l;
  }
  function open(opts) {
    mount();
    if (!getSess()) { ensureLogin().then(function () { open(opts); }, function () {}); return; }
    var s = getSess(); touch();
    ui.srcs = srcList(); ui.blob = null; ui.src = null; ui.subject = (opts && opts.subject) || (preset && preset.subject) || O.subject || '';
    var first = ui.srcs[0].file ? null : ui.srcs[0];
    var isT = s.role === 'teacher';
    layer('<h2>' + FOLDER.replace('<svg', '<svg width="26" height="26"') + ' Save to portfolio<small>' + (isT ? 'Teacher' : esc(s.name)) + ' · <button class="link" id="sw">' + (isT ? 'Sign out' : 'Not you?') + '</button></small></h2>' +
      '<label>What do you want to save?</label><div id="srcs"></div><input id="fi" type="file" hidden accept="image/*,video/*,audio/*,application/pdf,text/plain">' +
      '<div class="prev" id="prev" hidden></div>' +
      '<label>Subject</label><div class="chips" id="subj"></div>' +
      '<label for="ti">Title</label><input id="ti" type="text" maxlength="100">' +
      '<label for="nt">' + (isT ? 'Note' : 'Tell your teacher about it') + ' (optional)</label><textarea id="nt" maxlength="400"></textarea>' +
      (isT ? '<label>Send to</label><div class="stu" id="stu">Loading…</div>' : '') +
      '<div class="err" id="e" role="alert"></div><div id="pg"></div><div class="row" style="margin-top:8px"><button class="pri grow" id="send" disabled>Save</button><button id="cx">Cancel</button></div>');
    $('#sw').onclick = function () { setSess(null); close(); if (isT) toast('Signed out'); else open(opts); };
    $('#cx').onclick = close;
    var box = $('#srcs');
    ui.srcs.forEach(function (sr) {
      var b = document.createElement('button'); b.className = 'opt'; b.dataset.id = sr.id; b.innerHTML = '<span><b>' + esc(sr.label) + '</b><span class="d">' + esc(sr.desc) + '</span></span>';
      b.onclick = function () { sr.file ? $('#fi').click() : pickSrc(sr); }; box.appendChild(b);
    });
    $('#fi').onchange = function (e) { var f = e.target.files[0]; if (!f) return; var sr = ui.srcs.filter(function (x) { return x.file; })[0]; ui.src = sr; markSrc(sr.id); setBlob(normalise(f).then(function (n) { n.filename = f.name; n.title = n.title || f.name.replace(/\.[^.]+$/, ''); return n; })); };
    var chips = $('#subj');
    SUBJECTS.forEach(function (sub) {
      var b = document.createElement('button'); b.textContent = sub; b.style.setProperty('--c', SC[sub]); b.className = ui.subject === sub ? 'on' : '';
      b.onclick = function () { ui.subject = sub; [].forEach.call(chips.children, function (x) { x.className = x.textContent === sub ? 'on' : ''; }); refresh(); }; chips.appendChild(b);
    });
    $('#ti').value = (preset && preset.title) || (O.app + ' – ' + new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }));
    if (preset && preset.note) $('#nt').value = preset.note;
    if (isT) call('roster').then(function (d) {
      ui.students = d.students;
      $('#stu').innerHTML = '<label><input type="checkbox" id="all"> <b>Everyone</b></label>' + d.students.map(function (x) { return '<label><input type="checkbox" class="sid" value="' + esc(x.id) + '"> ' + esc(x.name) + '</label>'; }).join('');
      $('#stu').onchange = function (e) { if (e.target.id === 'all') [].forEach.call(root.querySelectorAll('.sid'), function (c) { c.checked = e.target.checked; }); refresh(); };
    }, function (e) { $('#stu').textContent = e.message; });
    $('#send').onclick = send;
    if (first) pickSrc(first);
  }
  function markSrc(id) { [].forEach.call(root.querySelectorAll('.opt'), function (b) { b.classList.toggle('on', b.dataset.id === id); }); }
  function pickSrc(sr) { ui.src = sr; markSrc(sr.id); setBlob(Promise.resolve().then(function () { return sr.get(); }).then(normalise)); }
  function setBlob(p) {
    ui.blob = null; refresh();
    var pv = $('#prev'); pv.hidden = false; pv.textContent = 'Getting it ready…';
    p.then(function (n) {
      ui.blob = n; pv.innerHTML = '';
      var t = n.blob.type, u = URL.createObjectURL(n.blob);
      if (/^image\//.test(t)) { var im = new Image(); im.src = u; pv.appendChild(im); }
      else if (/^video\//.test(t)) { var v = document.createElement('video'); v.src = u; v.controls = true; v.muted = true; v.playsInline = true; pv.appendChild(v); }
      else pv.textContent = (n.filename || n.title || 'File') + ' (' + Math.max(1, Math.round(n.blob.size / 1024)) + ' KB)';
      if (n.title && $('#ti')) $('#ti').value = n.title;
      if (n.subject && SUBJECTS.indexOf(n.subject) > -1 && !ui.subject) { ui.subject = n.subject; [].forEach.call($('#subj').children, function (x) { x.className = x.textContent === n.subject ? 'on' : ''; }); }
      refresh();
    }).catch(function (e) { pv.textContent = ''; pv.hidden = true; $('#e').textContent = e.message === 'cancelled' ? '' : 'Could not get that ready: ' + e.message; });
  }
  function chosen() { return [].map.call(root.querySelectorAll('.sid:checked'), function (c) { return c.value; }); }
  function refresh() {
    var b = $('#send'); if (!b) return;
    var s = getSess(); var ok = ui.blob && ui.subject && (s.role !== 'teacher' || chosen().length);
    b.disabled = !ok;
    b.textContent = ok ? 'Save' : !ui.blob ? 'Save' : !ui.subject ? 'Pick a subject first' : 'Pick who it’s for';
  }
  function send() {
    var s = getSess(); if (!s || !ui.blob) return;
    var it = ui.blob; it.title = $('#ti').value.trim() || it.title; it.subject = ui.subject; it.note = $('#nt').value.trim();
    var targets = s.role === 'teacher' ? chosen() : [null];
    ui.busy = true; $('#send').disabled = true; $('#e').textContent = '';
    var done = 0, sent = [];
    $('#pg').innerHTML = '<div class="bar"><i id="pb"></i></div>';
    var chain = Promise.resolve();
    targets.forEach(function (sid) {
      chain = chain.then(function () { return upload(it, sid, function (f) { $('#pb').style.width = Math.round(((done + f) / targets.length) * 100) + '%'; }); }).then(function (item) { done++; sent.push(item); });
    });
    chain.then(function () {
      ui.busy = false;
      sent.forEach(function (i) { try { window.dispatchEvent(new CustomEvent('portfolio:sent', { detail: i })); } catch (e) {} });
      var T = s.role === 'teacher';
      layer('<div class="ok"><div class="tick">✓</div><h2 style="justify-content:center">Saved!</h2><p>' + (T ? 'Sent to ' + sent.length + ' student' + (sent.length > 1 ? 's' : '') + '.' : 'It’s in your <b>' + esc(it.subject) + '</b> folder.') + '</p></div>' +
        '<div class="row" style="justify-content:center"><button id="more">Save another</button><button class="pri" id="fin">' + (T ? 'Close' : 'That’s me done') + '</button></div>');
      $('#more').onclick = function () { open(); };
      $('#fin').onclick = function () { if (!T) setSess(null); close(); };
    }, function (e) {
      ui.busy = false; $('#pg').innerHTML = ''; $('#send').disabled = false;
      if (e.status === 401) { close(); toast('Please sign in again'); return; }
      $('#e').textContent = e.message;
    });
  }

  // ---------- public API ----------
  var api = {
    open: function (o) { open(o); },
    close: close,
    register: function (r) { if (r && r.get) { r.id = r.id || r.label; registered = registered.filter(function (x) { return x.id !== r.id; }); registered.push({ id: r.id, label: r.label || r.id, description: r.description, get: r.get }); } return api; },
    // Save something straight away (students) or open the panel pre-loaded (teachers).
    send: function (payload) {
      return ensureLogin().then(function (s) {
        return normalise(payload).then(function (n) {
          var p = (payload && typeof payload === 'object' && !(payload instanceof Blob) && !(payload instanceof HTMLCanvasElement)) ? payload : {};
          n.subject = n.subject || O.subject || ''; n.title = n.title || O.app;
          if (s.role === 'teacher' || !n.subject) { preset = Object.assign({}, p, { blob: n.blob }); open({ subject: n.subject }); return null; }
          return upload(n, null).then(function (item) { toast('Saved to your ' + item.subject + ' folder ✓'); window.dispatchEvent(new CustomEvent('portfolio:sent', { detail: item })); return item; });
        });
      });
    },
    // Quiz / test results:  ClassPortfolio.sendResult({title:'Times tables', score:8, total:10, subject:'Maths', details:[{q:'7x8',answer:'56',correct:true}]})
    sendResult: function (r) {
      var j = { type: 'result', app: O.app, title: r.title || O.app, score: r.score, total: r.total, percent: r.total ? Math.round((r.score / r.total) * 100) : null, details: r.details || [], date: new Date().toISOString() };
      return api.send({ json: j, kind: 'result', title: r.title || O.app + ' result', subject: r.subject, meta: { score: r.score, total: r.total }, note: r.note });
    },
    // A friendly prompt for the end of a quiz/game: "Save your result to your portfolio?"
    offer: function (payload, message) {
      mount();
      var l = $('#layer'); var d = document.createElement('div'); d.className = 'offer';
      d.innerHTML = '<span>' + esc(message || 'Save this to your portfolio?') + '</span><button class="pri" id="y">Save</button><button id="n">No thanks</button>';
      l.appendChild(d); d.querySelector('#n').onclick = function () { d.remove(); };
      d.querySelector('#y').onclick = function () { d.remove(); (payload && payload.score !== undefined ? api.sendResult(payload) : api.send(payload)).catch(function (e) { if (e.message !== 'cancelled') toast(e.message); }); };
    },
    screenshot: screenshot,
    showButton: function () { O.button = true; mount(); drawFab(); },
    hideButton: function () { O.button = false; if (host) drawFab(); },
    signOut: function () { setSess(null); },
    user: function () { var s = getSess(); return s ? { role: s.role, name: s.name } : null; },
    version: '1.0',
  };
  window.ClassPortfolio = api;
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
