/* Spelling — "Spelling" page in a student's / family's portfolio. CP.spellView(main, d, {who}) — d.spell comes from /api/my or /api/family. */
(function () {
  const { esc } = CP;
  const day = (s) => (window.MMM ? window.MMM.fmtDay(s) : s);

  // ---------- hover / tap a word to see what it means and how it's used ----------
  let tip;
  function showTip(el) {
    const w = el.getAttribute('data-w') || '', M = window.SPELL_MEANINGS || {}, m = M[w.toLowerCase()];
    if (!m) return;
    if (!tip) { tip = document.createElement('div'); tip.setAttribute('role', 'tooltip'); tip.style.cssText = 'position:fixed;z-index:90;max-width:300px;background:#1b1b1b;color:#fff3e0;border-radius:16px;padding:12px 16px;box-shadow:0 8px 24px rgba(0,0,0,.35);border-bottom:5px solid #ff6a1a;font-size:.95rem;line-height:1.4;pointer-events:none'; document.body.appendChild(tip); }
    tip.innerHTML = `<div style="font-weight:900;font-size:1.1rem;margin-bottom:3px">${esc(w)}</div><div>${esc(m[0])}</div><div style="margin-top:6px;opacity:.85"><b style="color:#ffb27a">e.g.</b> <i>${esc(m[1])}</i></div>`;
    tip.style.display = 'block';
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), innerWidth - tw - 8), y = r.bottom + 8;
    if (y + th > innerHeight - 8) y = Math.max(8, r.top - th - 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => { if (tip) tip.style.display = 'none'; };
  function wire(root) {
    root.querySelectorAll('.spw').forEach((el) => {
      el.addEventListener('mouseenter', () => showTip(el)); el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus', () => showTip(el)); el.addEventListener('blur', hideTip);
      el.addEventListener('click', (e) => { e.stopPropagation(); tip && tip.style.display === 'block' && tip.firstChild && tip.firstChild.textContent === el.getAttribute('data-w') ? hideTip() : showTip(el); });
    });
    if (!window.__spTipDoc) { window.__spTipDoc = 1; document.addEventListener('click', hideTip); window.addEventListener('scroll', hideTip, true); }
  }
  function view(main, d) {
    const s = d.spell || {}, name = CP.firstName(d.student.name), full = d.student.name;
    if (!s.listId) { main.innerHTML = `<div class="card dcard"><h3>Spelling</h3><p>${esc(name)}'s spelling list hasn't been set yet. Check back soon.</p></div>`; return; }
    const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0;
    let h = `<div class="card dcard" style="background:var(--cream)"><div class="row" style="align-items:flex-start;gap:18px">
      <div style="background:var(--char);color:var(--cream);border-radius:22px;padding:14px 22px;text-align:center;min-width:130px;border-bottom:8px solid var(--orange)"><div class="small" style="opacity:.75;font-weight:700">Spelling</div><div style="font-size:2.4rem;font-weight:900;line-height:1;letter-spacing:-.04em">Week ${s.week}</div></div>
      <div class="grow" style="min-width:220px"><h3 style="margin:0 0 4px">${esc(name)}'s words · ${esc(s.label)}</h3>
        <div style="height:14px;background:#e6dcc4;border-radius:99px;overflow:hidden;border:2px solid var(--char)"><i style="display:block;height:100%;width:${pct}%;background:var(--orange)"></i></div>
        <div class="small mute" style="margin-top:4px">${s.mastered} of ${s.total} words learned in this list${s.completed && s.completed.length ? ` · finished: ${s.completed.map(esc).join(', ')}` : ''}</div></div></div>`;
    if (s.finished) h += `<p style="margin:14px 0 0"><b>${esc(name)} has finished every spelling list! 🎉</b></p>`;
    else h += `<h3 style="margin:16px 0 8px">This week's ${s.words.length} words</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">${s.words.map((w, i) => `<div class="spw" data-w="${esc(w)}" tabindex="0" style="cursor:help;background:#fff;border:2.5px solid var(--char);border-radius:16px;padding:10px 14px;font-weight:800;font-size:1.25rem;color:#1b1b1b;display:flex;gap:10px;align-items:baseline"><span class="small" style="font-weight:700;width:1.2em;color:#6b6459">${i + 1}</span><span>${window.SPELL && window.SPELL.trickyHtml ? window.SPELL.trickyHtml(w) : esc(w)}</span></div>`).join('')}</div>
      <div class="row gap"><button class="btn pri" id="spPrint">Print this week's words</button><span class="small mute">The test is on paper at the end of the week.</span></div>`;
    h += '</div>';
    if (s.scores && s.scores.length) {
      h += `<h3 class="gap" style="color:var(--cream)">${esc(name)}'s spelling tests</h3>` + s.scores.slice(0, 20).map((t) => `<div class="card dcard gap" style="background:var(--cream)"><div class="row"><b class="grow">Week ${t.week} · ${esc(t.label)}</b><span class="small mute">${esc(day(t.day))}</span><b style="font-size:1.25rem">${t.score}/${t.total}</b></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${t.results.map((r) => `<span class="spw" data-w="${esc(r[0])}" tabindex="0" style="cursor:help;border:2px solid var(--char);border-radius:99px;padding:2px 12px;font-weight:700;color:#1b1b1b;background:${r[1] ? '#c9f0c2' : '#ffd0c2'}">${r[1] ? '✓' : '✗'} ${esc(r[0])}</span>`).join('')}</div></div>`).join('');
    }
    main.innerHTML = h;
    wire(main);
    const b = main.querySelector('#spPrint');
    if (b) b.onclick = () => window.MMM.openPrint({ title: `Spelling words — ${full}`, pages: window.SPELL.testPages([{ name: full, label: s.label, week: s.week, words: s.words, tricky: true }]) });
  }
  CP.spellView = view;
  CP.spellLabel = (s) => (!s || !s.listId ? '' : s.finished ? 'All done' : 'Week ' + s.week);
})();
