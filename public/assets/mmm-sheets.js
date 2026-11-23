/* Mad Maths Minute — sheet maker, answer solver and print preview (no dependencies).
   Needs assets/mmm-data.js (and assets/mmm-basic.js for Basic Facts).
   MMM.testPages(items), MMM.practicePages(items), MMM.bfPages(items), MMM.openPrint({title, pages}) */
(function () {
  const D = window.MMM_DATA || {};
  const SKILLS = Object.keys(D).map(Number).sort((a, b) => a - b);
  const FIRST = SKILLS[0] || 8, LAST = SKILLS[SKILLS.length - 1] || 50;
  const BAND = { orange: '#ff4a1c', green: '#7bc96f', blue: '#5aa9ff', yellow: '#ffc933', purple: '#a58bff' };
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OPSYM = { '+': '+', '-': '−', x: '×', '÷': '÷' };

  // ---------- questions ----------
  function parseQ(s) {
    let m = /^h(\d+)=_$/.exec(s);
    if (m) return { kind: 'half', n: +m[1] };
    m = /^(_|\d+)([+\-x÷])(_|\d+)=(_|\d+)$/.exec(s);
    if (!m) return null;
    const v = (x) => (x === '_' ? null : +x);
    return { kind: 'eq', a: v(m[1]), op: m[2], b: v(m[3]), c: v(m[4]) };
  }
  const okNum = (n) => (n !== null && Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null);
  function answer(s) { // the number that goes in the blank, or null when there isn't one (e.g. dividing by 0)
    const q = parseQ(s);
    if (!q) return null;
    if (q.kind === 'half') return q.n / 2;
    const { a, b, c, op } = q;
    if (c === null) {
      if (op === '+') return a + b; if (op === '-') return okNum(a - b); if (op === 'x') return a * b;
      return b ? okNum(a / b) : null;
    }
    if (a === null) {
      if (op === '+') return okNum(c - b); if (op === '-') return okNum(c + b); if (op === 'x') return b ? okNum(c / b) : null;
      return okNum(c * b);
    }
    if (op === '+') return okNum(c - a); if (op === '-') return okNum(a - c); if (op === 'x') return a ? okNum(c / a) : null;
    return c ? okNum(a / c) : null;
  }
  function qHtml(s, withAns) {
    const q = parseQ(s);
    if (!q) return esc(s);
    const ans = withAns ? answer(s) : undefined;
    const bl = () => `<span class="bl${withAns ? ' ans' : ''}">${withAns ? (ans === null ? '—' : esc(ans)) : ''}</span>`;
    const num = (n) => (n === null ? bl() : `<span class="n">${n}</span>`);
    if (q.kind === 'half') return `<span class="n">½ of ${q.n}</span> <span class="eq">=</span> ${bl()}`;
    return `${num(q.a)} <span class="op">${OPSYM[q.op]}</span> ${num(q.b)} <span class="eq">=</span> ${q.c === null ? bl() : num(q.c)}`;
  }
  const plain = (s) => { const q = parseQ(s); if (!q) return s; if (q.kind === 'half') return '½ of ' + q.n + ' = ?'; return [q.a === null ? '__' : q.a, OPSYM[q.op], q.b === null ? '__' : q.b, '=', q.c === null ? '__' : q.c].join(' '); };

  // ---------- print document ----------
  const CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0;background:#fff}
body{font-family:Poppins,"Avenir Next","Helvetica Neue",Arial,sans-serif;color:#1b1b1b}
.pg{width:210mm;height:297mm;padding:9mm;page-break-after:always;break-after:page;overflow:hidden;display:flex;gap:6mm;position:relative}
.pg:last-child{page-break-after:auto;break-after:auto}
.bl{display:inline-block;min-width:11mm;height:1.05em;border-bottom:1.3pt solid #1b1b1b;vertical-align:baseline;margin:0 .6mm;text-align:center;font-weight:800;line-height:1}
.bl.ans{color:#e63a0e;border-bottom-color:#e63a0e;min-width:9mm}
.n{font-weight:700} .op,.eq{font-weight:700;margin:0 .4mm}
/* --- test slip (two per page) --- */
.slip{flex:1;min-width:0;border:2pt solid #1b1b1b;border-radius:5mm;display:flex;flex-direction:column;overflow:hidden;background:#fff}
.slip.blank{border:0;visibility:hidden}
.sh{background:#1b1b1b;color:#f5ecd9;padding:3.2mm 4mm 2.6mm;display:flex;align-items:center;gap:3mm;position:relative;border-bottom:3mm solid var(--band)}
.sh img{width:11mm;height:11mm;object-fit:contain;flex:none}
.sh .t{font-weight:900;font-size:13.5pt;letter-spacing:-.02em;line-height:1.05}
.sh .k{font-size:9pt;font-weight:700;opacity:.9}
.sh .sup{display:inline-block;background:var(--band);color:#1b1b1b;border-radius:99px;padding:0 2.2mm;font-size:7pt;font-weight:800;margin-left:1.5mm;vertical-align:middle}
.nm{display:flex;gap:3mm;align-items:flex-end;padding:2.6mm 4mm 1.4mm;font-size:9pt;font-weight:700}
.nm .f{flex:1;border-bottom:1.2pt solid #1b1b1b;min-height:6mm;font-size:12pt;font-weight:800;padding-bottom:.4mm;white-space:nowrap;overflow:hidden}
.nm .d{width:24mm;border-bottom:1.2pt solid #1b1b1b;min-height:6mm}
.goal{padding:1mm 4mm 1.2mm;font-size:8.2pt;line-height:1.3}
.goal .eg{font-size:7.2pt;opacity:.75;margin-top:.6mm}
.how{margin:0 4mm 2mm;padding:1.4mm 2.4mm;background:#f5ecd9;border-radius:2mm;font-size:7.6pt;line-height:1.3;font-weight:600}
.qs{list-style:none;margin:0;padding:0;flex:1;display:flex;flex-direction:column;border-top:1pt solid #1b1b1b}
.qs li{flex:1;display:flex;align-items:center;gap:3mm;padding:0 4mm;border-bottom:.7pt solid #9a9285;font-size:15.5pt}
.qs li:last-child{border-bottom:1pt solid #1b1b1b}
.qs li i{font-style:normal;font-size:7.5pt;font-weight:700;width:5mm;color:#6b6459;flex:none}
.score{display:flex;align-items:stretch;border-bottom:.7pt solid #9a9285}
.score .l{flex:1;padding:2mm 4mm;font-weight:900;font-size:11.5pt;line-height:1.1}
.score .l small{display:block;font-weight:600;font-size:6.8pt;opacity:.75}
.score .b{width:22mm;border-left:1.4pt solid #1b1b1b}
.tot{display:flex;align-items:stretch;border-bottom:.7pt solid #9a9285;font-size:8.2pt;font-weight:600}
.tot .l{flex:1;padding:1.8mm 4mm;line-height:1.25}
.tot .b{width:22mm;border-left:1.4pt solid #1b1b1b}
.now{padding:2mm 4mm 3mm;font-size:8pt;font-weight:600;line-height:1.5}
.now b{font-weight:800}
.now .cb{display:flex;gap:2mm;align-items:center}
.now .cb s{display:inline-block;width:3.4mm;height:3.4mm;border:1.2pt solid #1b1b1b;border-radius:.8mm;flex:none}
/* --- practice sheet (one per page) --- */
.pg.pr{flex-direction:column;gap:0}
.ph{display:flex;align-items:center;gap:4mm;background:#1b1b1b;color:#f5ecd9;border-radius:5mm 5mm 0 0;padding:3.5mm 5mm;border-bottom:3mm solid var(--band)}
.ph img{width:13mm;height:13mm;object-fit:contain}
.ph .t{font-weight:900;font-size:16pt;letter-spacing:-.02em;line-height:1.05}
.ph .k{font-size:9.5pt;font-weight:700;opacity:.9}
.ph .sup{display:inline-block;background:var(--band);color:#1b1b1b;border-radius:99px;padding:0 2.4mm;font-size:7.5pt;font-weight:800;margin-left:1.5mm;vertical-align:middle}
.ph .grow{flex:1}
.ph .who{text-align:right;font-size:8pt;font-weight:600;opacity:.8}
.ph .who b{display:block;font-size:13pt;font-weight:800;color:#fff;opacity:1}
.pgoal{display:flex;gap:4mm;align-items:center;padding:1.6mm 1mm 1mm;font-size:8.6pt;line-height:1.3}
.pgoal .how2{margin-left:auto;background:#f5ecd9;border-radius:2mm;padding:1.4mm 2.6mm;font-weight:600;font-size:7.8pt;max-width:75mm}
.sec{margin-top:1mm}
.sec h3{margin:0 0 1.2mm;font-size:10.5pt;font-weight:900;letter-spacing:-.01em;display:flex;align-items:center;gap:2mm}
.sec h3 span{background:var(--band);padding:.2mm 3mm;border-radius:99px;font-size:8.5pt}
.cols{display:grid;grid-template-columns:repeat(4,1fr);gap:2.4mm}
.col{border:1.4pt solid #1b1b1b;border-radius:3mm;overflow:hidden}
.col .dn{background:#f5ecd9;font-weight:800;font-size:8.6pt;padding:.8mm 2.4mm;border-bottom:1pt solid #1b1b1b}
.col .q{height:6.95mm;display:flex;align-items:center;padding:0 2.4mm;border-bottom:.5pt solid #b9b2a4;font-size:11pt;white-space:nowrap}
.col .q:last-child{border-bottom:0}
.col .q .bl{min-width:7mm}
.foot{position:absolute;left:9mm;right:9mm;bottom:5mm;display:flex;justify-content:space-between;font-size:6.8pt;color:#6b6459;font-weight:600}
/* --- basic facts sheet --- */
.pg.bf{flex-direction:column;gap:0}
.bfh{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3mm}
.bfh .t{font-size:17pt;font-weight:900;letter-spacing:-.02em}
.bfh .m{font-size:9pt;font-weight:700;color:#6b6459}
.bfi{display:flex;gap:7mm;margin-bottom:3mm;font-size:9pt;font-weight:700;color:#444;align-items:flex-end}
.bfi .f{display:inline-block;min-width:30mm;border-bottom:1.3pt solid #1b1b1b;font-size:12pt;font-weight:800;color:#1b1b1b;padding:0 1mm}
.bfg{display:grid;grid-template-columns:repeat(10,1fr);gap:1.2mm;flex:1}
.bfc{border:1.2pt solid #1b1b1b;border-radius:2mm;padding:1mm 1.2mm;display:flex;flex-direction:column;justify-content:space-between}
.bfc small{font-size:6pt;color:#8a8478;font-weight:700;line-height:1}
.bfc b{font-size:10.5pt;font-weight:800;line-height:1.15}
.bfc u{display:block;border-bottom:1.1pt solid #1b1b1b;height:4mm;text-decoration:none}
.bfc i{display:block;font-style:normal;font-size:10pt;font-weight:800;color:#1b7a3a;border-bottom:1.1pt solid #1b1b1b;height:4mm;line-height:4mm}
.pg.cov{padding:16mm 16mm 12mm;display:flex;flex-direction:column;gap:7mm}
.cov .ct{background:#1b1b1b;color:#fff3e0;border-radius:6mm;padding:9mm 10mm;border-bottom:3mm solid #ff6a1a}
.cov .ct small{display:block;font-weight:700;opacity:.75;font-size:10pt;letter-spacing:.06em;text-transform:uppercase}
.cov .ct h1{margin:2mm 0 0;font-size:34pt;font-weight:900;letter-spacing:-.03em;line-height:1}
.cov .who2{display:flex;align-items:baseline;gap:4mm;font-size:13pt;font-weight:700}
.cov .who2 b{flex:1;border-bottom:1.2pt solid #1b1b1b;font-size:19pt;padding-bottom:1mm}
.cov table{width:100%;border-collapse:collapse;font-size:11pt}
.cov th{text-align:left;font-size:8.5pt;text-transform:uppercase;letter-spacing:.05em;color:#6b6459;padding:0 2mm 2mm}
.cov td{border:1.2pt solid #1b1b1b;height:11.5mm;padding:0 3mm;font-weight:700}
.cov td.w{width:28mm;background:#fff3e0}.cov td.d{width:34mm}.cov td.sc{width:42mm}.cov td.tm{width:36mm}
.cov .tips{font-size:10.5pt;line-height:1.5;background:#fff3e0;border-radius:4mm;padding:4mm 6mm;margin-top:auto}
.cov .foot2{display:flex;justify-content:space-between;font-size:8.5pt;color:#8a8478;font-weight:700}
@media screen{body{background:#d9d4c8}.pg{margin:8px auto;box-shadow:0 2px 10px rgba(0,0,0,.25);background:#fff}}
`;
  const artBase = () => location.origin + '/assets/art/';
  function doc(pages, title) {
    return `<!DOCTYPE html><html lang="en-NZ"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
  }

  const bandOf = (sk) => BAND[(D[sk] || {}).band] || BAND.orange;
  const logo = () => `<img src="${artBase()}sticker-dog.png" alt="" onerror="this.remove()">`;
  const supBadge = (sk) => (D[sk] && D[sk].super ? '<span class="sup">SUPER SKILL</span>' : '');
  const goalHtml = (sk) => `I am learning to <b>${esc(D[sk].goal)}</b>.${D[sk].eg ? `<div class="eg">e.g. ${esc(D[sk].eg)}</div>` : ''}`;

  const fit = (n) => { const l = String(n || '').length; return l > 24 ? 8 : l > 18 ? 9.5 : l > 13 ? 11 : 12; };
  // ---------- test slips (two to a page, only the ones asked for) ----------
  function slip(sk, name, withAns) {
    const d = D[sk];
    if (!d) return '<div class="slip blank"></div>';
    const qs = d.test.map((q, i) => `<li><i>${i + 1}.</i><span>${qHtml(q, withAns)}</span></li>`).join('');
    return `<div class="slip" style="--band:${bandOf(sk)}">
      <div class="sh">${logo()}<div><div class="t">Mad Maths Minute</div><div class="k">Skill ${sk}${supBadge(sk)}${withAns ? ' · ANSWERS' : ''}</div></div></div>
      <div class="nm"><span>Name:</span><span class="f" style="font-size:${fit(name)}pt">${esc(name || '')}</span><span>Date:</span><span class="d"></span></div>
      <div class="goal">${goalHtml(sk)}</div>
      <div class="how">Work in pencil till the one-minute timer goes off, and then finish in pen.</div>
      <ol class="qs">${qs}</ol>
      <div class="score"><div class="l">Mad Minute Score<small>(total correct in one minute)</small></div><div class="b"></div></div>
      <div class="tot"><div class="l">Total correct<br>taking as long as I like</div><div class="b"></div></div>
      <div class="now">Now I need to:<div class="cb"><s></s><b>Keep learning</b> to get more right</div><div class="cb"><s></s><b>Keep learning</b> to get faster</div><div class="cb"><s></s><b>Move on</b> to a new skill</div></div>
    </div>`;
  }
  function testPages(items, withAns) { // items: [{skill, name}] — two per page, a spare half stays blank
    const out = [];
    for (let i = 0; i < items.length; i += 2) {
      const a = items[i], b = items[i + 1];
      out.push(`<div class="pg">${slip(a.skill, a.name, withAns)}${b ? slip(b.skill, b.name, withAns) : '<div class="slip blank"></div>'}</div>`);
    }
    return out;
  }

  // ---------- practice sheets (one per page: Mon–Thu at school + Mon–Thu home learning) ----------
  function practicePages(items, withAns) {
    return items.map(({ skill: sk, name }) => {
      const d = D[sk];
      if (!d) return '';
      const col = (set, i) => `<div class="col"><div class="dn">${DAYS[i]}</div>${set[i].map((q) => `<div class="q">${qHtml(q, withAns)}</div>`).join('')}</div>`;
      const sec = (label, set) => `<div class="sec"><h3>${label}</h3><div class="cols">${[0, 1, 2, 3].map((i) => col(set, i)).join('')}</div></div>`;
      return `<div class="pg pr" style="--band:${bandOf(sk)}">
        <div class="ph">${logo()}<div><div class="t">Mad Maths Minute — Practice</div><div class="k">Skill ${sk}${supBadge(sk)}${withAns ? ' · ANSWERS' : ''}</div></div><span class="grow"></span><div class="who"><span>Name</span><b>${esc(name || '________________')}</b></div></div>
        <div class="pgoal"><div>${goalHtml(sk)}</div><div class="how2">Work in pencil for one minute, then finish in pen. You’ve aced it when you can do 15 answers in a minute!</div></div>
        ${sec('At school', d.school)}${sec('Home learning', d.home)}
        <div class="foot"><span>Mad Maths Minute · Skill ${sk}</span><span>${esc(window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.className || '')}</span></div>
      </div>`;
    });
  }

  // ---------- Basic Facts worksheet (100 questions) ----------
  function bfQuestions(term, week) { const B = window.BASIC_FACTS_DATA || {}; return (B[term] && B[term][week]) || []; }
  const bfText = (q) => q.replace('x', '×').replace(/([+\-×÷])/g, ' $1 ');
  function bfPages(items, withAns) { // items: [{term, week, name}]
    return items.map(({ term, week, name }) => {
      const qs = bfQuestions(term, week);
      if (!qs.length) return '';
      return `<div class="pg bf"><div class="bfh"><div class="t">Basic Facts — Term ${term}, Week ${week}${withAns ? ' · ANSWERS' : ''}</div><div class="m">100 questions · 5 minutes</div></div>
        <div class="bfi"><span>Name: <span class="f">${esc(name || '')}</span></span><span>Date: <span class="f"></span></span><span>Score: <span class="f" style="min-width:18mm"></span> / 100</span></div>
        <div class="bfg">${qs.map((q, i) => `<div class="bfc"><small>${i + 1}</small><b>${esc(bfText(q))} =</b>${withAns ? `<i>${esc(String(bfSolve(q)))}</i>` : '<u></u>'}</div>`).join('')}</div></div>`;
    });
  }
  function bfCover(term, name, weeks) {
    const cls = window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.className || '';
    return `<div class="pg cov"><div class="ct"><small>${esc(cls)} · Mad Maths Minute</small><h1>Basic Facts<br>Term ${term} pack</h1></div>
      <div class="who2">Name <b>${esc(name || '')}</b></div>
      <table><thead><tr><th>Test</th><th>Date</th><th>Score (out of 100)</th><th>Time</th></tr></thead><tbody>${weeks.map((w) => `<tr><td class="w">Week ${w}</td><td class="d"></td><td class="sc"></td><td class="tm"></td></tr>`).join('')}</tbody></table>
      <div class="tips"><b>How it works:</b> do one test each week. Set a timer for 5 minutes, work as fast as you can, then mark it and write your score and time here. The goal is to get <b>more right</b> and to get them <b>faster</b>. Keep this pack in your tray — your teacher will tell you when to start the next week.</div>
      <div class="foot2"><span>Basic Facts · Term ${term}</span><span>${weeks.length} tests</span></div></div>`;
  }
  // A whole term's tests, one pack per student (cover page + every week), then an optional answer key
  function termPack(items, o = {}) {
    const term = o.term, weeks = (o.weeks && o.weeks.length ? o.weeks : bfWeeks(term)).filter((w) => bfQuestions(term, w).length);
    let out = [];
    items.forEach(({ name }) => {
      if (o.cover !== false) out.push(bfCover(term, name, weeks));
      out = out.concat(bfPages(weeks.map((week) => ({ term, week, name }))));
    });
    if (o.answers) out = out.concat(bfPages(weeks.map((week) => ({ term, week, name: 'Answer key' })), true));
    return out;
  }
  function bfSolve(q) {
    const m = /^(\d+)([+\-x÷])(\d+)$/.exec(q);
    if (!m) return NaN;
    const a = +m[1], b = +m[3];
    return m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === 'x' ? a * b : a / b;
  }
  const bfWeeks = (term) => { const B = window.BASIC_FACTS_DATA || {}; return B[term] ? Object.keys(B[term]).map(Number).sort((a, b) => a - b) : []; };

  // ---------- preview + print ----------
  function openPrint(o) {
    const pages = (o.pages || []).filter(Boolean);
    if (!pages.length) { alert('Nothing to print.'); return; }
    const html = doc(pages, o.title || 'Mad Maths Minute');
    const m = document.createElement('div');
    m.className = 'modal'; m.style.zIndex = 80;
    m.innerHTML = `<div class="card" style="width:min(980px,96vw);height:min(94vh,1100px);display:flex;flex-direction:column;gap:10px;padding:14px">
      <div class="row"><h3 style="margin:0" class="grow">${esc(o.title || 'Print preview')} <span class="mute small" style="font-weight:600">· ${pages.length} page${pages.length === 1 ? '' : 's'}</span></h3>
        <button class="btn pri" id="mmmGo">Print / Save as PDF</button><button class="btn" id="mmmX">Close</button></div>
      <p class="small mute" style="margin:0">In the print window choose your printer, or choose <b>Save as PDF</b> to download. Set “Paper size” to A4 and “Scale” to 100%.</p>
      <iframe id="mmmFrame" title="Preview" style="flex:1;border:0;border-radius:10px;background:#d9d4c8"></iframe></div>`;
    document.body.appendChild(m);
    const fr = m.querySelector('#mmmFrame');
    fr.srcdoc = html;
    const close = () => m.remove();
    m.querySelector('#mmmX').onclick = close;
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    m.querySelector('#mmmGo').onclick = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { alert('Could not open the print window — try again.'); } };
  }

  // ---------- small score chart (SVG) ----------
  function scoreChart(scores) { // skill-test scores, oldest → newest; y is 0–15
    const pts = scores.filter((s) => s.kind === 'skill').slice().reverse();
    if (!pts.length) return '';
    const W = 640, H = 220, L = 34, R = 12, T = 14, B = 34;
    const x = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1));
    const y = (v) => T + (H - T - B) * (1 - v / 15);
    let g = '';
    [0, 5, 10, 15].forEach((v) => { g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 15 ? '#e63a0e' : '#d8cfba'}" stroke-width="${v === 15 ? 1.6 : 1}" ${v === 15 ? 'stroke-dasharray="5 4"' : ''}/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#6b6459">${v}</text>`; });
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.score)}`).join(' ');
    const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.score)}" r="5.5" fill="${p.advanced ? '#a8e6a1' : '#fff'}" stroke="#1b1b1b" stroke-width="2"><title>Skill ${p.skill}: ${p.score}/15 on ${p.day}</title></circle>`).join('');
    const step = Math.max(1, Math.ceil(pts.length / 8));
    const labs = pts.map((p, i) => (i % step === 0 || i === pts.length - 1) ? `<text x="${x(i)}" y="${H - 14}" text-anchor="middle" font-size="10.5" fill="#6b6459">Skill ${p.skill}</text>` : '').join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="mmm-chart" style="width:100%;height:auto" role="img" aria-label="Mad Minute scores over time">${g}<path d="${line}" fill="none" stroke="#1b1b1b" stroke-width="2.4" stroke-linejoin="round"/>${dots}${labs}</svg>`;
  }
  const fmtDay = (d) => { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${+dd}/${+m}/${y}`; };
  const fmtTime = (s) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };

  window.MMM = { D, SKILLS, FIRST, LAST, BAND, parseQ, answer, qHtml, plain, testPages, practicePages, bfPages, bfCover, termPack, bfQuestions, bfText, bfSolve, bfWeeks, openPrint, doc, scoreChart, fmtDay, fmtTime, bandOf, esc };
})();
