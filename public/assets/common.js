/* Class Portfolio — shared front-end helpers (no build step, no dependencies) */
(function () {
  const CFG = Object.assign({ className: 'My Class', schoolName: '', year: '', subjects: ['Maths', 'Reading', 'Writing', 'Topic'] }, window.PORTFOLIO_CONFIG || {});
  const SUBJ_ALL = CFG.subjects.concat(['Inbox']);

  const ICON = {
    logo: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    video: '<polygon points="6 4 20 12 6 20 6 4"/>',
    audio: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    text: '<path d="M4 6h16M4 10h16M4 14h10M4 18h12"/>',
    result: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    eyeoff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    cloud: '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  };
  const svg = (n, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra || ''}>${ICON[n] || ''}</svg>`;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const dateFmt = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDate = (t) => dateFmt.format(new Date(t));
  function ago(t) {
    if (!t) return 'No work yet';
    const d = (Date.now() - t) / 864e5;
    if (d < 1 / 24) return 'Just now';
    if (d < 1) return Math.round(d * 24) + ' h ago';
    if (d < 2) return 'Yesterday';
    if (d < 30) return Math.floor(d) + ' days ago';
    return fmtDate(t);
  }
  const fmtSize = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');
  const firstName = (n) => String(n || '').trim().split(/\s+/)[0];
  const AV = ['#ffc6d3', '#9bbcff', '#bdf0b4', '#fff1a3', '#dccbff', '#ffd2ae'];
  const avColor = (id) => AV[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  const initials = (n) => String(n).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const fmtCode = (c) => c.slice(0, 3) + '-' + c.slice(3);

  function toast(msg, ms) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2600);
  }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {} ta.remove();
    }
    toast(msg || 'Copied');
  }

  // ---------- API ----------
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    del: (k) => { try { localStorage.removeItem(k); } catch {} },
  };
  async function api(path, o = {}) {
    const h = Object.assign({}, o.headers || {});
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    let body = o.body;
    if (body && typeof body === 'object' && !(body instanceof Blob)) { body = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    let r;
    try { r = await fetch('/api/' + path, { method: o.method || 'GET', headers: h, body }); }
    catch { const e = new Error('Can\'t reach the server. Check the internet and try again.'); e.status = 0; throw e; }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || 'Something went wrong'); e.status = r.status; throw e; }
    return d;
  }

  // ---------- QR ----------
  function qrSvg(text) {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }

  // ---------- work cards ----------
  function thumbHtml(it) {
    const meta = it.meta || {};
    let inner;
    if (it.kind === 'image') inner = `<img loading="lazy" alt="" src="${esc(it.url)}">`;
    else if (it.kind === 'video') inner = `<video muted playsinline preload="metadata" src="${esc(it.url)}#t=0.1"></video><span class="play">${svg('video')}</span>`;
    else inner = svg(it.kind in ICON ? it.kind : 'file');
    const badge = it.kind === 'result' && meta.total ? `<span class="badge">${esc(meta.score)}/${esc(meta.total)}</span>` : '';
    return `<div class="thumb s-${esc(it.subject)}">${inner}${badge}</div>`;
  }
  function workCard(it, o = {}) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'work';
    b.setAttribute('aria-label', 'Open ' + it.title);
    const flags = [];
    if (o.teacher && !it.familyVisible) flags.push(`<span title="Hidden from family">${svg('eyeoff')}</span>`);
    if (it.teacherComment) flags.push(`<span title="Teacher comment">${svg('chat')}</span>`);
    b.innerHTML = `${thumbHtml(it)}<div class="meta"><div class="ttl">${esc(it.title)}</div><div class="sub"><span>${fmtDate(it.createdAt)}</span>${it.app ? `<span>· ${esc(it.app)}</span>` : ''}${o.student ? `<span>· ${esc(it.studentName || '')}</span>` : ''}${flags.join('')}</div></div>`;
    b.onclick = () => openViewer(it, o);
    return b;
  }

  // ---------- viewer ----------
  async function openViewer(it, o = {}) {
    const m = document.createElement('div');
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => { if (e.target === m) close(); });

    let stage = '';
    if (it.kind === 'image') stage = `<img alt="${esc(it.title)}" src="${esc(it.url)}">`;
    else if (it.kind === 'video') stage = `<video controls playsinline preload="metadata" src="${esc(it.url)}"></video>`;
    else if (it.kind === 'audio') stage = `<audio controls src="${esc(it.url)}"></audio>`;
    else if (it.kind === 'pdf') stage = `<iframe title="${esc(it.title)}" src="${esc(it.url)}"></iframe>`;
    else if (it.kind === 'text' || it.kind === 'result') stage = `<div class="result" id="vtext">Loading…</div>`;
    else stage = `<a class="btn pri" href="${esc(it.url)}?dl=1">${svg('dl')} Download file</a>`;

    const t = o.teacher;
    const subjOpts = SUBJ_ALL.map((s) => `<option ${s === it.subject ? 'selected' : ''}>${s}</option>`).join('');
    m.innerHTML = `<div class="sheet"><div class="stage">${stage}</div><div class="side">
      <div class="row"><span class="pill s-${esc(it.subject)}">${esc(it.subject)}</span><button class="btn sm closex" aria-label="Close">${svg('x')}</button></div>
      <h3 id="vt">${esc(it.title)}</h3>
      <p class="mute small">${it.studentName ? esc(it.studentName) + ' · ' : ''}${fmtDate(it.createdAt)}${it.app ? ' · ' + esc(it.app) : ''} · ${fmtSize(it.size)}${it.sentBy === 'teacher' ? ' · added by teacher' : ''}</p>
      ${it.note ? `<p><b>Note:</b> ${esc(it.note)}</p>` : ''}
      ${t ? `<label for="vc">Comment for ${esc(firstName(o.studentName || it.studentName || 'student'))} &amp; family</label><textarea id="vc" maxlength="1000" placeholder="Write a quick comment…"></textarea>
        <div class="row"><div class="grow"><label for="vs">Subject</label><select id="vs">${subjOpts}</select></div></div>
        <label class="row" style="font-weight:700;margin-top:12px"><input type="checkbox" id="vf" ${it.familyVisible ? 'checked' : ''}> Visible to family</label>
        <div class="row gap"><button class="btn pri" id="vsave">Save</button><a class="btn" href="${esc(it.url)}?dl=1">${svg('dl')} Download</a><button class="btn danger" id="vdel">${svg('trash')} Delete</button></div>`
        : `${it.teacherComment ? `<div class="card flat" style="background:var(--yel)"><b>Teacher comment</b><p>${esc(it.teacherComment)}</p></div>` : ''}
        <div class="row gap"><a class="btn" href="${esc(it.url)}?dl=1">${svg('dl')} Download</a>${o.canDelete ? `<button class="btn danger" id="vdel">${svg('trash')} Delete</button>` : ''}</div>`}
    </div></div>`;
    document.body.appendChild(m);
    $('.closex', m).onclick = close;
    if (t) $('#vc', m).value = it.teacherComment || '';

    if (it.kind === 'text' || it.kind === 'result') {
      fetch(it.url).then((r) => r.text()).then((txt) => {
        const box = $('#vtext', m);
        if (it.kind === 'result') {
          let d; try { d = JSON.parse(txt); } catch { d = null; }
          if (!d) { box.innerHTML = `<pre style="white-space:pre-wrap;text-align:left">${esc(txt)}</pre>`; return; }
          const pct = d.total ? Math.round((d.score / d.total) * 100) : null;
          const list = Array.isArray(d.details) ? d.details : [];
          box.innerHTML = `<div class="mute small">${esc(d.title || it.title)}</div>${d.total != null ? `<div class="big">${esc(d.score)}<span class="mute">/${esc(d.total)}</span></div><div class="mute">${pct}%</div>` : ''}${list.length ? `<ol>${list.map((x) => typeof x === 'object' ? `<li class="${x.correct === true ? 'ok' : x.correct === false ? 'no' : ''}">${esc(x.q || x.question || x.label || '')}${x.answer != null ? ` — <b>${esc(x.answer)}</b>` : ''}</li>` : `<li>${esc(x)}</li>`).join('')}</ol>` : ''}`;
        } else box.innerHTML = `<pre>${esc(txt)}</pre>`;
      }).catch(() => { $('#vtext', m).textContent = 'Could not load this file.'; });
    }

    if (t) {
      $('#vsave', m).onclick = async () => {
        try {
          const d = await api('items/' + it.id, { method: 'PATCH', token: o.token(), body: { teacherComment: $('#vc', m).value, subject: $('#vs', m).value, familyVisible: $('#vf', m).checked } });
          Object.assign(it, d.item, { studentName: it.studentName });
          toast('Saved'); close(); o.onChange && o.onChange(it);
        } catch (e) { toast(e.message); }
      };
    }
    const del = $('#vdel', m);
    if (del) del.onclick = async () => {
      if (!confirm('Delete "' + it.title + '"? This cannot be undone.')) return;
      try { await api('items/' + it.id, { method: 'DELETE', token: o.token() }); toast('Deleted'); close(); o.onChange && o.onChange(null, it); } catch (e) { toast(e.message); }
    };
  }

  // ---------- portfolio view (shared by student + family pages) ----------
  function renderPortfolio(root, items, o = {}) {
    let cur = CFG.subjects[0];
    const counts = (s) => items.filter((i) => i.subject === s).length;
    const inbox = counts('Inbox');
    const subs = CFG.subjects.concat(inbox && o.showInbox ? ['Inbox'] : []);
    const draw = () => {
      root.innerHTML = `<div class="tabs" role="tablist">${subs.map((s) => `<button class="tab s-${s}" role="tab" aria-selected="${s === cur}" data-s="${s}">${s}<span class="n">${counts(s)}</span></button>`).join('')}</div><div id="pf" class="grid c3"></div>`;
      $$('.tab', root).forEach((b) => (b.onclick = () => { cur = b.dataset.s; draw(); }));
      const box = $('#pf', root); const list = items.filter((i) => i.subject === cur);
      if (!list.length) { box.className = ''; box.innerHTML = `<div class="empty"><h3>Nothing in ${esc(cur)} yet</h3><p>${esc(o.emptyText || 'Work will appear here once it has been saved.')}</p></div>`; return; }
      list.forEach((it) => box.appendChild(workCard(it, Object.assign({}, o, { onChange: (n, old) => { if (!n) items.splice(items.indexOf(old), 1); draw(); } }))));
    };
    draw();
  }

  window.CP = { CFG, SUBJ_ALL, svg, esc, $, $$, fmtDate, ago, fmtSize, firstName, avColor, initials, fmtCode, toast, copy, api, store, qrSvg, workCard, openViewer, renderPortfolio };
})();
