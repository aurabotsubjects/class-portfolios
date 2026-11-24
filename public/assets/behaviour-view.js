/* Behaviour & work-ethic line graph + the student/family "Behaviour" page.
   CP.behaviourChart(entries, {days})  entries: [{kind:'behaviour'|'effort', level:1-5, day:'YYYY-MM-DD'}]
   CP.behaviourView(main, d, {who})    d.behaviour comes from /api/my or /api/family */
(function () {
  const { esc } = CP, F = () => CP.FACE, INK = '#1b1b1b';
  const dstr = (day, o) => new Date(day + 'T12:00:00').toLocaleDateString('en-NZ', o || { weekday: 'short', day: 'numeric', month: 'short' });
  const ago = (day) => { const n = Math.round((Date.now() - new Date(day + 'T12:00:00').getTime()) / 864e5); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : dstr(day); };

  function chart(entries, o) {
    o = o || {};
    let days = [...new Set(entries.map((e) => e.day))].sort();
    if (o.days && days.length) { const end = new Date(days[days.length - 1] + 'T12:00:00').getTime(); days = days.filter((d) => (end - new Date(d + 'T12:00:00').getTime()) / 864e5 < o.days); }
    if (!days.length) return '<p class="mute">No entries yet.</p>';
    const W = 720, H = 320, L = 74, R = 24, T = 20, B = 52, n = days.length;
    const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1)), y = (lv) => T + ((5 - lv) * (H - T - B)) / 4;
    const lab = { 5: 'Best', 4: 'Great', 3: 'Neutral', 2: 'Low', 1: 'Tough' };
    let g = '';
    for (let lv = 1; lv <= 5; lv++) g += `<line x1="${L}" x2="${W - R}" y1="${y(lv)}" y2="${y(lv)}" stroke="${lv === 3 ? '#1b1b1b' : '#1b1b1b33'}" stroke-width="${lv === 3 ? 2 : 1.5}" ${lv === 3 ? 'stroke-dasharray="6 5"' : ''}/><text x="${L - 10}" y="${y(lv) + 5}" text-anchor="end" font-size="13" font-weight="700" fill="${INK}">${lab[lv]}</text>`;
    const every = Math.ceil(n / 9), show = new Set(); for (let i = n - 1; i >= 0; i -= every) show.add(i); // labels counted back from the latest day so they never collide
    days.forEach((d, i) => { if (show.has(i)) g += `<text x="${x(i)}" y="${H - 26}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}">${dstr(d, { day: 'numeric', month: 'short' })}</text>`; });
    ['behaviour', 'effort'].forEach((k) => {
      const pts = days.map((d, i) => { const e = entries.find((q) => q.kind === k && q.day === d); return e ? { x: x(i), y: y(e.level), e, d } : null; }).filter(Boolean), c = F().LINE[k];
      if (pts.length > 1) g += `<polyline points="${pts.map((p) => p.x + ',' + p.y).join(' ')}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
      pts.forEach((p) => (g += `<circle cx="${p.x}" cy="${p.y}" r="7.5" fill="${c}" stroke="${INK}" stroke-width="3"><title>${esc(dstr(p.d))} — ${k === 'behaviour' ? 'Behaviour' : 'Work ethic'}: ${esc(F().LABEL[k][p.e.level])}</title></circle>`));
    });
    const key = `<div class="bkey"><span><i style="background:${F().LINE.behaviour}"></i>Behaviour</span><span><i style="background:${F().LINE.effort}"></i>Work ethic</span></div>`;
    return `${key}<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Behaviour and work ethic over time">${g}</svg>`;
  }

  const css = `.bnow .card,.bkey,.bday,.brange,.bleg,#dmain details.card{color:#1b1b1b}.bkey{display:flex;gap:18px;flex-wrap:wrap;font-weight:800;margin-bottom:6px}.bkey span{display:inline-flex;align-items:center;gap:8px}.bkey i{width:30px;height:8px;border-radius:99px;border:2px solid #1b1b1b;display:inline-block}
.bnow{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:14px}.bnow .card{display:flex;gap:16px;align-items:center;padding:16px 20px}
.bnow small{display:block;font-weight:800;text-transform:uppercase;letter-spacing:.05em;opacity:.65;font-size:.74rem}.bnow b{font-size:1.5rem;font-weight:900;letter-spacing:-.02em;display:block;line-height:1.1}
.bstrip{display:flex;gap:10px;overflow:auto;padding:4px 2px 10px}.bday{flex:none;text-align:center;background:#fff;border:2.5px solid #1b1b1b;border-radius:16px;padding:8px 10px;min-width:96px}.bday .dt{font-weight:800;font-size:.78rem;margin-bottom:4px}
.brange{display:flex;gap:8px;margin:0 0 8px}.brange button{border:2.5px solid #1b1b1b;background:#fff;border-radius:99px;padding:5px 14px;font:800 .85rem Poppins,sans-serif;cursor:pointer;color:#1b1b1b}.brange button[aria-pressed=true]{background:#1b1b1b;color:#f5ecd9}
.bleg{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:8px}.bleg div{text-align:center;font-weight:700;font-size:.82rem}`;

  function view(main, d, o) {
    if (!document.getElementById('bhCss')) { const s = document.createElement('style'); s.id = 'bhCss'; s.textContent = css; document.head.appendChild(s); }
    const entries = d.behaviour || [], name = CP.firstName(d.student.name);
    const last = (k) => entries.filter((e) => e.kind === k).slice(-1)[0];
    const card = (k, title) => { const e = last(k); return `<div class="card">${e ? CP.face(k, e.level, 92) : '<span style="width:92px;height:92px;display:inline-grid;place-items:center;font-size:2.4rem;opacity:.3">?</span>'}<div><small>${title}</small><b>${e ? esc(F().LABEL[k][e.level]) : 'Nothing yet'}</b>${e ? `<span class="mute small">${esc(ago(e.day))}</span>` : ''}</div></div>`; };
    if (!entries.length) { main.innerHTML = `<h2 class="dh2" style="margin-top:0">Behaviour &amp; work ethic</h2><div class="card dcard dempty"><div><h3>Nothing here yet</h3><p>${esc(name)}’s teacher will add a face for behaviour and for work ethic here, and they will build into a graph over time.</p></div></div>`; return; }
    let range = 28;
    const draw = () => {
      const days = [...new Set(entries.map((e) => e.day))].sort(), recent = days.slice(-10).reverse();
      main.innerHTML = `<h2 class="dh2" style="margin-top:0">Behaviour &amp; work ethic</h2>
        <div class="bnow">${card('behaviour', 'Behaviour')}${card('effort', 'Work ethic')}</div>
        <div class="card dcard"><div class="brange" role="group" aria-label="Time range">${[[14, 'Last 2 weeks'], [28, 'Last 4 weeks'], [0, 'Everything']].map(([v, t]) => `<button type="button" data-r="${v}" aria-pressed="${v === range}">${t}</button>`).join('')}</div>${chart(entries, { days: range || 0 })}</div>
        <h3 class="dh2">Recent days</h3><div class="bstrip">${recent.map((day) => { const b = entries.find((e) => e.day === day && e.kind === 'behaviour'), w = entries.find((e) => e.day === day && e.kind === 'effort'); return `<div class="bday"><div class="dt">${esc(dstr(day))}</div>${b ? CP.face('behaviour', b.level, 46) : ''}${w ? CP.face('effort', w.level, 46) : ''}</div>`; }).join('')}</div>
        <details class="card dcard" style="margin-top:12px"><summary style="font-weight:800;cursor:pointer">What do the faces mean?</summary>
          <p class="small" style="margin:10px 0 2px"><b>Behaviour</b></p><div class="bleg">${[5, 4, 3, 2, 1].map((l) => `<div>${CP.face('behaviour', l, 56)}<br>${esc(F().LABEL.behaviour[l])}</div>`).join('')}</div>
          <p class="small" style="margin:14px 0 2px"><b>Work ethic</b></p><div class="bleg">${[5, 4, 3, 2, 1].map((l) => `<div>${CP.face('effort', l, 56)}<br>${esc(F().LABEL.effort[l])}</div>`).join('')}</div></details>`;
      main.querySelectorAll('.brange button').forEach((b) => (b.onclick = () => { range = +b.dataset.r; draw(); }));
    };
    draw();
  }
  CP.behaviourChart = chart; CP.behaviourView = view; CP.fmtBehDay = dstr;
})();
