/* Class Portfolio — progress, reports, charts, downloads (shared by teacher, student and family pages) */
(function () {
  const { esc, CFG, svg, toast, firstName, fmtDate, api } = CP;
  const CUR = window.PORTFOLIO_CURRICULUM || {};
  const SCALE = window.PORTFOLIO_SCALE || ['Not set', 'Emerging', 'Developing', 'Consolidating', 'Proficient', 'Exceeding'];
  const SCALE_DESC = window.PORTFOLIO_SCALE_DESC || [];
  const SUBJ = CFG.subjects;
  const DARK = { Maths: '#4f7be0', Reading: '#e0607e', Writing: '#c79a00', Topic: '#3f9f4a', Inbox: '#8a6fd1' };

  // ---------- checklist ----------
  const hash = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h.toString(36); };
  const yearOf = (s) => (s && s.year >= 4 && s.year <= 6 ? s.year : (s && s.year) || 5);
  function listFor(subject, year) {
    const by = CUR[subject] || {};
    const y = by[year] ? year : Object.keys(by).map(Number).sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
    return ((by[y]) || []).map((text, i) => ({ text, key: subject + '|' + y + '|' + hash(text), id: subject + '.' + y + '.' + (i + 1), year: y }));
  }
  function progressFor(checks, subject, year) {
    const l = listFor(subject, year); let secure = 0, working = 0;
    l.forEach((x) => { const v = (checks || {})[x.key] || 0; if (v === 2) secure++; else if (v === 1) working++; });
    return { n: l.length, secure, working, pct: l.length ? Math.round((secure / l.length) * 100) : 0 };
  }
  function termNow() { const m = new Date().getMonth() + 1; return m <= 4 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4; } // NZ school terms, approximate
  const expectedPct = () => termNow() * 25;
  const attOf = (checks, subject) => (checks || {})['att|' + subject] || 0;

  function ckBar(p, withExpected) {
    if (!p.n) return '<div class="small mute">No checklist set</div>';
    const g = (p.secure / p.n) * 100, y = (p.working / p.n) * 100;
    return `<div class="ckbar" role="img" aria-label="${p.secure} of ${p.n} achieved, ${p.working} working on"><i class="g" style="width:${g}%"></i><i class="y" style="width:${y}%;left:${g}%"></i>${withExpected ? `<u style="left:${expectedPct()}%" title="Roughly where we'd expect to be this term"></u>` : ''}</div>`;
  }

  // ---------- charts (SVG) ----------
  const resultsOf = (items) => items.filter((i) => i.kind === 'result' && i.meta && i.meta.total).sort((a, b) => a.createdAt - b.createdAt);
  function chartResults(items) {
    const r = resultsOf(items);
    if (!r.length) return '<div class="empty small" style="padding:22px">No test or quiz scores saved yet.</div>';
    const W = 620, H = 230, L = 40, R = 14, T = 14, B = 34, t0 = r[0].createdAt, t1 = Math.max(r[r.length - 1].createdAt, t0 + 864e5 * 7);
    const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R), y = (p) => T + (1 - p / 100) * (H - T - B);
    let g = [0, 25, 50, 75, 100].map((p) => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" stroke="#d8d2ea"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" font-size="11" fill="#6f6a8c">${p}%</text>`).join('');
    const subs = [...new Set(r.map((i) => i.subject))];
    subs.forEach((s) => {
      const pts = r.filter((i) => i.subject === s).map((i) => [x(i.createdAt), y((i.meta.score / i.meta.total) * 100), i]);
      g += `<polyline fill="none" stroke="${DARK[s] || '#555'}" stroke-width="2.5" points="${pts.map((p) => p[0] + ',' + p[1]).join(' ')}"/>` + pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${DARK[s] || '#555'}" stroke="#fffbf1" stroke-width="2"><title>${esc(p[2].title)} — ${p[2].meta.score}/${p[2].meta.total} (${fmtDate(p[2].createdAt)})</title></circle>`).join('');
    });
    const ticks = [t0, (t0 + t1) / 2, t1].map((t) => `<text x="${x(t)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6f6a8c">${new Date(t).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</text>`).join('');
    const lg = subs.map((s) => `<span><i style="background:${DARK[s]}"></i>${s}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Test and quiz scores over time">${g}${ticks}</svg><div class="lg">${lg}</div>`;
  }
  function chartMonthly(items) {
    if (!items.length) return '<div class="empty small" style="padding:22px">No work saved yet.</div>';
    const now = new Date(), months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('en-NZ', { month: 'short' }), c: {} }); }
    items.forEach((it) => { const d = new Date(it.createdAt), mo = months.find((q) => q.y === d.getFullYear() && q.m === d.getMonth()); if (mo) mo.c[it.subject] = (mo.c[it.subject] || 0) + 1; });
    const max = Math.max(4, ...months.map((m) => Object.values(m.c).reduce((a, b) => a + b, 0)));
    const W = 620, H = 210, L = 30, B = 30, T = 10, bw = (W - L - 10) / 6 - 14;
    let g = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W - 6}" y1="${T + (1 - f) * (H - T - B)}" y2="${T + (1 - f) * (H - T - B)}" stroke="#d8d2ea"/><text x="${L - 5}" y="${T + (1 - f) * (H - T - B) + 4}" text-anchor="end" font-size="11" fill="#6f6a8c">${Math.round(max * f)}</text>`).join('');
    months.forEach((mo, i) => {
      let yy = H - B; const x = L + 10 + i * ((W - L - 10) / 6);
      Object.entries(mo.c).forEach(([s, n]) => { const h = (n / max) * (H - T - B); yy -= h; g += `<rect x="${x}" y="${yy}" width="${bw}" height="${h}" rx="3" fill="${DARK[s] || '#999'}"><title>${s}: ${n}</title></rect>`; });
      g += `<text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6f6a8c">${mo.label}</text>`;
    });
    const lg = SUBJ.map((s) => `<span><i style="background:${DARK[s]}"></i>${s}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Pieces of work saved each month">${g}</svg><div class="lg">${lg}</div>`;
  }
  function levelMeter(level) {
    const i = SCALE.findIndex((s, k) => k > 0 && String(level || '').toLowerCase().includes(s.toLowerCase()));
    if (i < 1) return level ? `<span class="pill plain">${esc(level)}</span>` : '';
    return `<div class="meter" title="${esc(SCALE[i])}: ${esc(SCALE_DESC[i] || '')}">${SCALE.slice(1).map((s, k) => `<span class="${k + 1 <= i ? 'on' : ''}${k + 1 === i ? ' cur' : ''}">${k + 1 === i ? esc(s) : ''}</span>`).join('')}</div>`;
  }

  // ---------- report display ----------
  const fill = (t, name) => String(t == null ? '' : t).replace(/\[Name\]/g, name || 'this student');
  const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  const ul = (l, name) => (arr(l).length ? `<ul>${arr(l).map((x) => `<li>${esc(fill(typeof x === 'string' ? x : x.text || x.title || JSON.stringify(x), name))}</li>`).join('')}</ul>` : '');
  function reportHtml(rep, name, o = {}) {
    const d = rep.data || {};
    if (d.markdown && !d.subjects) return `<div class="rep"><h3>${esc(rep.title)}</h3><p class="mute small">${fmtDate(rep.createdAt)}</p><div style="white-space:pre-wrap">${esc(fill(d.markdown, name))}</div></div>`;
    const subs = Object.entries(d.subjects || {}).sort((a, b) => SUBJ.indexOf(a[0]) - SUBJ.indexOf(b[0]));
    return `<div class="rep"><h3>${esc(fill(d.title || rep.title, name))}</h3><p class="mute small">${fmtDate(rep.createdAt)}${rep.term ? ' · Term ' + rep.term : ''}</p>
      ${d.overview ? `<p class="lead2">${esc(fill(d.overview, name))}</p>` : ''}
      ${arr(d.celebrate).length ? `<div class="cel"><h4>Worth celebrating</h4>${ul(d.celebrate, name)}</div>` : ''}
      <div class="grid c2">${subs.map(([s, v]) => { v = v || {}; return `<div class="card flat subj s-${esc(s)}"><div class="row"><h4 style="margin:0" class="grow">${esc(s)}</h4></div>${levelMeter(v.level)}
        ${v.summary ? `<p>${esc(fill(v.summary, name))}</p>` : ''}
        ${arr(v.strengths).length ? `<h5>Strengths</h5>${ul(v.strengths, name)}` : ''}
        ${arr(v.improve).length ? `<h5>To improve</h5>${ul(v.improve, name)}` : ''}
        ${arr(v.nextSteps).length ? `<h5>Next steps</h5>${ul(v.nextSteps, name)}` : ''}
        ${arr(v.homeActivities).length ? `<h5>Ideas to try at home</h5><ul class="home">${arr(v.homeActivities).map((a) => (typeof a === 'string' ? `<li>${esc(fill(a, name))}</li>` : `<li><b>${esc(fill(a.title, name))}</b>${a.minutes ? ` <span class="mute small">(about ${esc(a.minutes)} min)</span>` : ''}<br>${esc(fill(a.how || '', name))}</li>`)).join('')}</ul>` : ''}</div>`; }).join('')}</div>
      ${arr(d.nextStepsOverall).length ? `<h4>Overall next steps</h4>${ul(d.nextStepsOverall, name)}` : ''}
      ${o.teacher && arr(d.teacherNotes).length ? `<div class="card flat" style="background:var(--yel)"><h4>Private notes for you (not shared)</h4>${ul(d.teacherNotes, name)}</div>` : ''}</div>`;
  }

  // ---------- zip + downloads ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  async function makeZip(entries, onProgress) {
    const parts = [], central = [], enc = new TextEncoder(), d = new Date(); let offset = 0, count = 0; const failed = [];
    const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]; let data;
      try { data = await e.data(); } catch (err) { failed.push(e.name); onProgress && onProgress(i + 1, entries.length); continue; }
      const u = typeof data === 'string' ? enc.encode(data) : data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
      const nm = enc.encode(e.name), crc = crc32(u), size = u.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nm.length, true);
      parts.push(new Blob([lh.buffer, nm, u]));
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
      central.push(new Blob([ch.buffer, nm]));
      offset += 30 + nm.length + size; count++;
      onProgress && onProgress(i + 1, entries.length);
    }
    const cd = central.reduce((a, b) => a + b.size, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, count, true); end.setUint16(10, count, true); end.setUint32(12, cd, true); end.setUint32(16, offset, true);
    return { blob: new Blob([...parts, ...central, end.buffer], { type: 'application/zip' }), failed };
  }
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 120000);
  }
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/aac': 'aac', 'application/pdf': 'pdf', 'text/plain': 'txt', 'text/markdown': 'md', 'text/csv': 'csv', 'application/json': 'json' };
  const safe = (s) => String(s).replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) || 'file';
  const dstr = (t) => new Date(t).toISOString().slice(0, 10);
  function fileNames(items) {
    const used = new Set();
    return items.map((it) => {
      const ext = EXT[it.mime] || (it.mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5);
      let base = `${it.subject}/${dstr(it.createdAt)} ${safe(it.title)}`, n = base, k = 2;
      while (used.has(n + '.' + ext)) n = base + ' (' + k++ + ')';
      used.add(n + '.' + ext); return n + '.' + ext;
    });
  }
  function summaryHtml(student, items, names, reports, checks, o = {}) {
    const nm = firstName(student.name), y = yearOf(student);
    const css = 'body{font:16px/1.5 system-ui,sans-serif;max-width:900px;margin:30px auto;padding:0 18px;color:#3b3656}h1,h2,h3{font-family:Georgia,serif}h2{border-bottom:2px solid #58517a;padding-bottom:4px;margin-top:34px}img{max-width:260px;max-height:200px;border:2px solid #58517a;border-radius:8px;margin:4px}.it{display:inline-block;vertical-align:top;width:280px;margin:6px;font-size:14px}.card{border:2px solid #58517a;border-radius:10px;padding:10px 14px;margin:10px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}.mute{color:#6f6a8c}.pill{border:1.5px solid #58517a;border-radius:99px;padding:1px 9px;font-size:13px}.meter{display:flex;gap:3px;margin:6px 0}.meter span{flex:1;height:10px;background:#e3dff0;border-radius:5px;text-align:center;font-size:11px}.meter span.on{background:#bdf0b4}.ckbar{position:relative;height:12px;background:#e3dff0;border-radius:6px;overflow:hidden}.ckbar i{position:absolute;top:0;bottom:0}.ckbar .g{background:#4caf6b}.ckbar .y{background:#ffd54a}.ckbar u{position:absolute;top:0;bottom:0;width:3px;background:#3b3656}.chart{width:100%;height:auto}.lg span{margin-right:14px;font-size:13px}.lg i{display:inline-block;width:11px;height:11px;margin-right:4px}';
    let h = `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><title>${esc(nm)}'s portfolio</title><style>${css}</style></head><body><h1>${esc(student.name)} — learning portfolio</h1><p class="mute">${esc(CFG.className)}${CFG.schoolName ? ' · ' + esc(CFG.schoolName) : ''} · saved ${fmtDate(Date.now())} · ${items.length} pieces of work</p>`;
    if (reports.length) h += `<h2>Learning summary</h2>` + reports.slice(0, 3).map((r) => reportHtml(r, nm, o)).join('');
    if (checks && o.showChecks) h += `<h2>Curriculum progress</h2><div class="grid">${SUBJ.map((s) => { const p = progressFor(checks, s, y); return `<div class="card"><b>${s}</b> <span class="mute">${p.secure} of ${p.n} achieved</span>${ckBar(p, false)}</div>`; }).join('')}</div>`;
    if (resultsOf(items).length) h += `<h2>Test and quiz scores</h2>${chartResults(items)}`;
    SUBJ.concat(['Inbox']).forEach((s) => {
      const l = items.map((it, i) => [it, names[i]]).filter((x) => x[0].subject === s); if (!l.length) return;
      h += `<h2>${s}</h2>` + l.map(([it, n]) => `<div class="it">${it.kind === 'image' ? `<a href="${encodeURI(n)}"><img src="${encodeURI(n)}" alt=""></a><br>` : ''}<b>${esc(it.title)}</b><br><span class="mute">${fmtDate(it.createdAt)}${it.app ? ' · ' + esc(it.app) : ''}${it.meta && it.meta.total ? ' · ' + esc(it.meta.score) + '/' + esc(it.meta.total) : ''}</span><br><a href="${encodeURI(n)}">${esc(n.split('/').pop())}</a>${it.teacherComment ? `<br><i>Teacher: ${esc(it.teacherComment)}</i>` : ''}${it.note ? `<br><i>Note: ${esc(it.note)}</i>` : ''}</div>`).join('');
    });
    return h + '</body></html>';
  }
  // items: array of portfolio items; opts: {student, reports, checks, subject?, button, onProgress, backup}
  async function downloadPortfolio(o) {
    const items = (o.subject ? o.items.filter((i) => i.subject === o.subject) : o.items).slice().sort((a, b) => a.createdAt - b.createdAt);
    const names = fileNames(items), nm = safe(o.student.name);
    const entries = items.map((it, i) => ({ name: names[i], data: async () => { const r = await fetch(it.url); if (!r.ok) throw new Error('x'); return r.blob(); } }));
    const html = summaryHtml(o.student, items, names, o.reports || [], o.checks, { showChecks: o.showChecks });
    entries.unshift({ name: 'Open this first - summary.html', data: async () => html });
    const { blob, failed } = await makeZip(entries, o.onProgress);
    if (failed.length) toast(failed.length + ' file(s) could not be included', 5000);
    saveBlob(blob, `${nm} portfolio${o.subject ? ' - ' + o.subject : ''} ${dstr(Date.now())}.zip`);
    return { count: items.length, bytes: blob.size, failed };
  }
  function downloadButton(btn, getOpts, label) {
    btn.onclick = async () => {
      const o = getOpts(); const orig = btn.innerHTML; btn.disabled = true;
      const total = o.items.filter((i) => !o.subject || i.subject === o.subject).reduce((a, i) => a + i.size, 0);
      if (total > 500e6 && !confirm('This is a large download (about ' + Math.round(total / 1e6) + ' MB) and may be slow on a phone. Continue?')) { btn.disabled = false; return; }
      try {
        o.onProgress = (d, n) => (btn.textContent = `Preparing ${d} of ${n + 1}…`);
        const r = await downloadPortfolio(o); toast('Downloaded ' + r.count + ' files');
      } catch (e) { toast('Could not make the download: ' + e.message, 4000); }
      btn.disabled = false; btn.innerHTML = orig;
    };
  }

  // ---------- Claude pack (anonymised prompt) ----------
  const anon = (t, s) => {
    const n = String(s.name || '').split(/\s+/).filter((x) => x.length > 1).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return n.length ? String(t || '').replace(new RegExp('\\b(' + n.join('|') + ')\\b', 'gi'), '[Name]') : String(t || '');
  };
  const pct = (m) => Math.round((m.score / m.total) * 100);
  async function buildPack(student, items, checks, reports, o) {
    const y = yearOf(student), term = o.term || termNow(), perSub = o.imagesPerSubject || 8;
    const gender = { he: 'male', she: 'female', they: 'gender not specified (use they/them)' }[student.pron] || 'gender not specified (use they/them)';
    const files = [];
    const L = [];
    L.push(`You are an experienced New Zealand primary teacher and learning coach. I am the classroom teacher and I want you to help me (1) mark and summarise one student's learning from their portfolio, (2) show how they are progressing against curriculum expectations, and (3) suggest what to improve, next steps, and activities families can do at home.`);
    L.push(`The student is anonymous: Year ${y}, Term ${term}, ${gender}. Never ask for or guess a name; write [Name] wherever the name belongs, and use the correct pronouns.`);
    L.push(`Context: ${CFG.reportContext || 'New Zealand primary school, Years 5-6, New Zealand Curriculum.'}`);
    L.push(`Judge the evidence against New Zealand Curriculum expectations for Year ${y}. Use ONLY the evidence below and in the attached files. Do not invent evidence. Where there is little or no evidence for a subject, say so, use "Not enough evidence yet" as the level, and say what work to collect.`);
    L.push(`ATTAINMENT DESCRIPTORS (use these exact words for "level"): ${SCALE.slice(1).map((s, i) => s + ' = ' + SCALE_DESC[i + 1]).join('; ')}.`);
    L.push(`WRITING RULES: strengths-based but honest; specific, with evidence from the work; warm, professional, plain English parents can understand; third person; never address the student directly; do not compare with other children; no hunches. If you notice anything that could worry a family, put it ONLY in "teacherNotes" so I can check it first.`);
    L.push('', 'DATA:');
    for (const s of SUBJ) {
      const its = items.filter((i) => i.subject === s).sort((a, b) => b.createdAt - a.createdAt);
      const att = attOf(checks, s), list = listFor(s, y), P = progressFor(checks, s, y);
      L.push('', `## ${s}`);
      L.push(`- My attainment judgement: ${att ? SCALE[att] : 'not set'}; pieces of work saved: ${its.length}.`);
      if (list.length) {
        const g = (v) => list.filter((x) => ((checks || {})[x.key] || 0) === v).map((x) => `[${x.id}] ${x.text}`);
        L.push(`- Curriculum checklist (${P.secure}/${P.n} achieved; about ${expectedPct()}% expected by now):`);
        if (g(2).length) L.push(`  Achieved: ${g(2).join('; ')}`);
        if (g(1).length) L.push(`  Working on: ${g(1).join('; ')}`);
        if (g(0).length) L.push(`  Not yet: ${g(0).join('; ')}`);
      }
      const res = its.filter((i) => i.kind === 'result' && i.meta && i.meta.total).slice(0, 15).reverse();
      if (res.length) L.push(`- Test/quiz scores, oldest to newest: ${res.map((r) => `${anon(r.title, student)} (${dstr(r.createdAt)}) ${r.meta.score}/${r.meta.total} = ${pct(r.meta)}%`).join('; ')}`);
      let nImg = 0, nPdf = 0, nTxt = 0;
      const lines = [];
      for (const it of its.slice(0, 14)) {
        if (it.kind === 'result') continue;
        let line = `${dstr(it.createdAt)} "${anon(it.title, student)}"${it.app ? ' (' + anon(it.app, student) + ')' : ''}`;
        if (it.kind === 'image' && nImg < perSub && /^image\/(png|jpeg|webp|gif)$/.test(it.mime)) { nImg++; const fn = `${s}_${String(nImg).padStart(2, '0')}.${EXT[it.mime]}`; files.push({ name: fn, item: it }); line += ` -> attached image ${fn}`; }
        else if (it.kind === 'pdf' && nPdf < 3 && it.size < 8e6) { nPdf++; const fn = `${s}_doc${nPdf}.pdf`; files.push({ name: fn, item: it }); line += ` -> attached PDF ${fn}`; }
        else if (it.kind === 'text' && nTxt < 3) { nTxt++; try { const t = (await (await fetch(it.url)).text()).slice(0, 2500); line += `\n    Student's text: """${anon(t, student)}"""`; } catch {} }
        else line += ` [${it.kind}; not attached]`;
        if (it.note) line += `\n    Student's note: ${anon(it.note, student)}`;
        if (it.teacherComment) line += `\n    My comment: ${anon(it.teacherComment, student)}`;
        lines.push('  - ' + line);
      }
      if (lines.length) L.push('- Work samples, newest first:', ...lines);
    }
    const last = (reports || [])[0];
    if (last && last.data && (last.data.overview || last.data.nextStepsOverall)) L.push('', '## Previous summary (for continuity — check whether those next steps were achieved)', anon(last.data.overview || '', student) + ' Next steps then: ' + arr(last.data.nextStepsOverall).map((x) => anon(typeof x === 'string' ? x : x.text, student)).join('; '));
    L.push('', 'TASKS:',
      '1. Look carefully at every attached image/PDF. Where it is maths, check the working and answers and describe patterns in errors and correct understanding; where it is writing or reading work, comment on ideas, structure, vocabulary, sentence control and accuracy.',
      '2. For each subject with evidence give: the level (exact descriptor words) with a one-line reason; a 2-3 sentence summary; 2-4 strengths with evidence; 1-3 things to improve (honest, specific, things the child can act on); 1-3 next learning steps; and 2-3 home activities (practical, free or low-cost, 5-15 minutes, no special equipment, suitable for a New Zealand family; each with a short title and how to do it).',
      '3. Overall: 2-4 things worth celebrating; 2-3 overall next steps; and "teacherNotes": 3-5 suggestions for MY teaching plus any concern (private).',
      '4. Checklist: for each checklist statement where the evidence clearly supports it, suggest status 2 (achieved) or 1 (working on). Use the ids in square brackets. Leave out anything you are unsure of.',
      '', 'OUTPUT: Start with two or three friendly sentences for me. Then give ONE json code block that matches this shape exactly (plain text values, no comments, keep [Name] in text, omit a subject only if there is no evidence at all):',
      '```json',
      JSON.stringify({
        schema: 'class-portfolio-report/1', title: `Term ${term} learning summary`, overview: '2-4 sentences about [Name]\'s learning overall',
        celebrate: ['...'],
        subjects: Object.fromEntries(SUBJ.map((s) => [s, { level: 'Emerging | Developing | Consolidating | Proficient | Exceeding | Not enough evidence yet', levelReason: '...', summary: '...', strengths: ['...'], improve: ['...'], nextSteps: ['...'], homeActivities: [{ title: '...', how: '...', minutes: 10 }] }])),
        nextStepsOverall: ['...'], teacherNotes: ['...'], checklistSuggestions: [{ id: SUBJ[0] + '.' + y + '.1', status: 2, reason: '...' }],
      }, null, 2),
      '```');
    return { prompt: L.join('\n'), files, term };
  }
  function extractJson(text) {
    const blocks = [...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
    const tryParse = (t) => { try { const o = JSON.parse(t); return o && typeof o === 'object' ? o : null; } catch { return null; } };
    for (const b of blocks) { const o = tryParse(b.trim()); if (o && (o.subjects || o.overview)) return o; }
    const s = String(text); const i = s.indexOf('{'); const j = s.lastIndexOf('}');
    if (i >= 0 && j > i) { const o = tryParse(s.slice(i, j + 1)); if (o && (o.subjects || o.overview)) return o; }
    return null;
  }
  const strs = (x, n = 8, len = 500) => arr(x).slice(0, n).map((v) => String(typeof v === 'string' ? v : v && (v.text || v.title) || '').slice(0, len)).filter(Boolean);
  function parseReply(text, student) {
    const o = extractJson(text);
    if (!o) return { data: { markdown: String(text).trim().slice(0, 40000) }, structured: false };
    const y = yearOf(student), d = { schema: 'class-portfolio-report/1', title: String(o.title || '').slice(0, 120), overview: String(o.overview || '').slice(0, 1500), celebrate: strs(o.celebrate), nextStepsOverall: strs(o.nextStepsOverall), teacherNotes: strs(o.teacherNotes, 10, 700), subjects: {}, checklistSuggestions: [] };
    for (const [k, v] of Object.entries(o.subjects || {})) {
      const s = SUBJ.find((x) => x.toLowerCase() === (k === 'Mathematics' || k === 'Math' ? 'maths' : String(k).toLowerCase())); if (!s || !v) continue;
      d.subjects[s] = { level: String(v.level || '').slice(0, 40), levelReason: String(v.levelReason || '').slice(0, 400), summary: String(v.summary || '').slice(0, 1200), strengths: strs(v.strengths), improve: strs(v.improve), nextSteps: strs(v.nextSteps), homeActivities: arr(v.homeActivities).slice(0, 5).map((a) => (typeof a === 'string' ? { title: a.slice(0, 120), how: '' } : { title: String(a.title || '').slice(0, 120), how: String(a.how || '').slice(0, 600), minutes: Number(a.minutes) || undefined })) };
    }
    const all = {}; SUBJ.forEach((s) => listFor(s, y).forEach((x) => (all[x.id] = x)));
    arr(o.checklistSuggestions).slice(0, 40).forEach((c) => { const x = all[String(c.id)]; const st = Number(c.status); if (x && (st === 1 || st === 2)) d.checklistSuggestions.push({ key: x.key, text: x.text, subject: x.id.split('.')[0], status: st, reason: String(c.reason || '').slice(0, 300) }); });
    return { data: d, structured: true };
  }

  // ---------- student / family summary page ----------
  function familySummary(root, d, o = {}) {
    const name = firstName(d.student.name), y = yearOf(d.student), reps = d.reports || [];
    const showChecks = !!d.checks;
    const closing = d.class && d.class.closed ? `<div class="card flat" style="background:var(--yel);margin-bottom:16px"><b>This school year's portfolio has finished.</b> ${d.class.familyUntil ? 'You can keep viewing and downloading until <b>' + fmtDate(d.class.familyUntil) + '</b>.' : ''} Please download ${esc(name)}'s work to keep.</div>` : '';
    root.innerHTML = `${closing}
      <div class="row noprint" style="margin:6px 0 14px"><button class="btn pri" id="dlall">${svg('dl')} Download everything (zip)</button><button class="btn" id="prt">${svg('print')} Print summary</button><span class="small mute">Pictures, videos, recordings and a summary page in one file.</span></div>
      <div class="tabs noprint" role="tablist"><button class="tab" role="tab" data-v="sum" aria-selected="true" style="--sc:var(--lil)">Learning summary</button><button class="tab" role="tab" data-v="work" aria-selected="false">All work<span class="n">${d.items.length}</span></button></div>
      <div id="vsum"></div><div id="vwork" class="hide"></div>`;
    const sum = root.querySelector('#vsum');
    let h = '';
    if (reps.length) h += reportHtml(reps[0], name) + (reps.length > 1 ? `<details class="card flat gap"><summary style="cursor:pointer;font-weight:800">Earlier summaries (${reps.length - 1})</summary>${reps.slice(1).map((r) => reportHtml(r, name)).join('<hr>')}</details>` : '');
    else h += `<div class="empty"><h3>${esc(name)}'s learning summary will appear here</h3><p>Your child's teacher shares a written summary with next steps and ideas for home from time to time.</p></div>`;
    if (showChecks) h += `<h3 class="gap">Curriculum progress</h3><div class="grid c2">${SUBJ.map((s) => { const p = progressFor(d.checks, s, y), a = attOf(d.checks, s); return `<div class="card flat"><div class="row"><b class="grow">${s}</b><span class="small mute">${p.secure} of ${p.n} achieved${p.working ? ', ' + p.working + ' in progress' : ''}</span></div>${ckBar(p, true)}${a ? levelMeter(SCALE[a]) : ''}</div>`; }).join('')}</div><p class="small mute">The dark marker shows roughly where we would expect to be at this point in the year.</p>`;
    if (resultsOf(d.items).length) h += `<h3 class="gap">Test and quiz scores</h3><div class="card flat">${chartResults(d.items)}</div>`;
    if (d.items.length) h += `<h3 class="gap">Work saved each month</h3><div class="card flat">${chartMonthly(d.items)}</div>`;
    sum.innerHTML = h;
    const work = root.querySelector('#vwork');
    CP.renderPortfolio(work, d.items, Object.assign({}, o.pfOpts || {}));
    // per-subject download buttons inside the work view
    const bar = document.createElement('div'); bar.className = 'row noprint'; bar.style.margin = '0 0 12px';
    bar.innerHTML = `<span class="small mute">Download just one subject:</span>${SUBJ.map((s) => `<button class="btn sm" data-s="${s}">${svg('dl')} ${s}</button>`).join('')}`;
    work.prepend(bar);
    const opts = (subject) => ({ student: d.student, items: d.items, reports: reps, checks: d.checks, showChecks, subject });
    downloadButton(root.querySelector('#dlall'), () => opts(), 'all');
    [...bar.querySelectorAll('button')].forEach((b) => downloadButton(b, () => opts(b.dataset.s)));
    root.querySelector('#prt').onclick = () => { root.querySelector('[data-v=sum]').click(); setTimeout(() => print(), 150); };
    root.querySelectorAll('.tabs > .tab[data-v]').forEach((t) => (t.onclick = () => {
      root.querySelectorAll('.tabs > .tab[data-v]').forEach((x) => x.setAttribute('aria-selected', x === t));
      sum.classList.toggle('hide', t.dataset.v !== 'sum'); work.classList.toggle('hide', t.dataset.v !== 'work');
    }));
  }

  Object.assign(CP, { SCALE, SCALE_DESC, SUBJ, DARK, hash, yearOf, listFor, progressFor, termNow, expectedPct, attOf, ckBar, chartResults, chartMonthly, levelMeter, reportHtml, fill, makeZip, saveBlob, fileNames, downloadPortfolio, downloadButton, buildPack, parseReply, familySummary, dstr, safe, resultsOf });
})();
