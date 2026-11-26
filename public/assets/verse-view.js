/* Memory verse of the week — student / family view and shared card */
(function () {
  const { esc } = CP;
  const css = `.mvc{position:relative;background:#fff8e6;border:3px solid #1b1b1b;border-radius:26px;box-shadow:6px 6px 0 #1b1b1b;padding:30px 34px;color:#1b1b1b;max-width:760px;overflow:hidden}
  .mvc:before{content:"\\201C";position:absolute;right:18px;top:-18px;font:900 150px/1 Poppins,sans-serif;color:var(--mvc,#ffd23f);opacity:.55}
  .mvc .mvk{display:inline-block;font-weight:800;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;background:var(--mvc,#ffd23f);border:2px solid #1b1b1b;border-radius:99px;padding:3px 12px;color:#1b1b1b}
  .mvc .mvt{font-weight:700;font-size:clamp(1.25rem,2.6vw,1.75rem);line-height:1.45;margin:16px 0 14px;position:relative;color:#1b1b1b}
  .mvc .mvr{font-weight:900;font-size:1.15rem;color:#e8501a}
  .mvc .mvs{color:#5a5248;font-size:.85rem;margin-top:10px}
  .mvempty{max-width:620px;color:#1b1b1b}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const find = (n) => (CP.VERSES || []).find((v) => v.n === n);
  const date = (at) => at ? new Date(at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', timeZone: 'Pacific/Auckland' }) : '';
  CP.verseCard = (v, at) => `<div class="mvc" style="--mvc:${CP.VERSE_COL[v.c] || '#ffd23f'}"><span class="mvk">${esc(CP.VERSE_CAT[v.c] || '')}</span>${v.n === 101 ? ' <span class="mvk" style="--mvc:#ffd23f">\u2605 Mr Clark\u2019s favourite</span>' : ''}<p class="mvt">${esc(v.t)}</p><div class="mvr">${esc(v.r)}</div>${at ? `<div class="mvs">Set ${esc(date(at))}</div>` : ''}</div>`;
  CP.currentVerse = (d) => { const x = d && d.calendar && d.calendar.verse; return x && x.n ? Object.assign({ at: x.at }, find(x.n)) : null; };
  CP.verseView = (main, d) => {
    const v = CP.currentVerse(d);
    main.innerHTML = `<h2 class="dh2" style="margin-top:0">Memory verse</h2>` + (v && v.t
      ? CP.verseCard(v, v.at) + `<p class="mvs" style="max-width:760px;color:#fff">Practise it every day — say it out loud, write it, and teach it to someone at home.</p>`
      : `<div class="card mvempty"><h3>No memory verse yet</h3><p>Your teacher hasn't chosen this week's verse yet — check back soon.</p></div>`);
  };
})();
