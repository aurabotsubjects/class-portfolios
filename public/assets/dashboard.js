/* Student / family dashboard (poster style). CP.dashboard(root, data, opts)
   opts: { who:'student'|'family', onDone(), pfOpts:{canDelete,token,showInbox,emptyText}, greeting }  */
(function () {
  const { svg, esc, firstName, initials, avColor, fmtDate, workCard } = CP;
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    Maths: P('<path d="M5 7h6M8 4v6M14 17h6M5 17l5-5M10 17l-5-5M14 8h6"/>'),
    Reading: P('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.500-2 6.500-2 9-.5V19c-2.500-1.500-5.500-1.500-9 .5-3.500-2-6.500-2-9-.5z"/><path d="M12 6v13.500"/>'),
    Writing: P('<path d="M4 20l1-4L16.500 4.500a2.100 2.100 0 0 1 3 3L8 19z"/><path d="M14.500 6.500l3 3"/>'),
    Topic: P('<path d="M12 21v-9"/><path d="M12 12c0-4 2.500-6 7-6 0 4-2.500 6-7 6z"/><path d="M12 15c0-3-2-5-6-5 0 3.500 2 5 6 5z"/>'),
    Inbox: P('<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>'),
    home: P('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'), learn: P('<path d="M12 4l9 4.500-9 4.500-9-4.500z"/><path d="M7 11v5c0 1.500 2.500 3 5 3s5-1.500 5-3v-5"/>'),
    bulb: P('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.6.500 1 1.200 1 2.100h5c0-.9.400-1.600 1-2.100A6 6 0 0 0 12 3z"/>'),
    cal: P('<rect x="3.500" y="5" width="17" height="15" rx="2.500"/><path d="M8 3v4M16 3v4M3.500 10h17"/>'),
    chart: P('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
    dl: P('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'), print: P('<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>'), grid: P('<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>'), out: P('<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>')
  };
  const tile = (s, n) => `<button class="dtile" data-go="s:${s}" aria-label="${s}"><span class="di"><img src="/assets/art/icon-${s.toLowerCase()}.png" alt="" onerror="this.remove()">${ICON[s] || ''}</span><span class="dl">${s}</span><span class="dn">${n}</span></button>`;

  function dashboard(root, d, o = {}) {
    const name = firstName(d.student.name), reps = d.reports || [], items = d.items, y = CP.yearOf(d.student);
    const subs = CFG.subjects.concat(o.pfOpts && o.pfOpts.showInbox && items.some((i) => i.subject === 'Inbox') ? ['Inbox'] : []);
    const cnt = (s) => items.filter((i) => i.subject === s).length;
    const rep = reps[0];
    const closing = d.class && d.class.closed ? `<div class="dclosed"><b>This school year's portfolio has finished.</b> ${d.class.familyUntil ? 'You can keep viewing and downloading until <b>' + esc(fmtDate(d.class.familyUntil)) + '</b>. ' : ''}Please download ${esc(name)}'s work to keep.</div>` : '';
    const cal = d.calendar || { events: [], notice: {} };
    const nav = [['home', 'home', 'My Portfolio'], ['cal', 'calendar', 'Calendar'], ['learn', 'learn', 'My Learning'], ['bulb', 'ideas', rep && o.who === 'family' ? 'Ideas for home' : 'Next steps']].concat(subs.map((s) => [s, 's:' + s, s]));
    const kia = o.who === 'student' ? 'Kia ora,' : 'Kia ora, whānau of';
    root.innerHTML = `${closing}<div class="dash"><div class="dtop"><span class="dlogo">${svg('logo')}</span><b>${esc(CFG.className)} Portfolio</b><span class="grow"></span>
        <button class="dib" data-go="home" aria-label="Home">${ICON.home}</button><button class="dib" data-go="calendar" aria-label="Calendar">${ICON.cal}</button><button class="dib" data-go="learn" aria-label="My learning">${ICON.learn}</button><button class="dib" data-go="work" aria-label="All work">${ICON.grid}</button><button class="dib" id="dprint" aria-label="Print summary">${ICON.print}</button>
        ${o.onDone ? `<button class="dib done" id="ddone">${ICON.out}<span>I'm done</span></button>` : ''}</div>
      <div class="dhero"><span class="dav" style="--c:${avColor(d.student.id)}">${esc(initials(d.student.name))}</span><div><div class="dk">${kia}</div><h1>${esc(name)}</h1><div class="dm">${items.length} piece${items.length === 1 ? '' : 's'} of learning</div></div></div>
      <div class="dbody"><nav class="dside" aria-label="Sections">${nav.map(([ic, k, l]) => `<button data-go="${k}">${ICON[ic] || ICON.grid}<span>${l}</span>${k.startsWith('s:') ? `<i>${cnt(k.slice(2))}</i>` : ''}</button>`).join('')}
        <button id="dzip" class="dzip">${ICON.dl}<span>Download everything</span></button></nav>
        <section class="dmain" id="dmain" tabindex="-1"></section></div></div>`;
    const main = root.querySelector('#dmain');
    const opts = (subject) => ({ student: d.student, items, reports: reps, checks: d.checks, showChecks: !!d.checks, subject });
    CP.downloadButton(root.querySelector('#dzip'), () => opts(), 'all');
    if (o.onDone) root.querySelector('#ddone').onclick = o.onDone;
    const card = (h) => `<div class="card dcard">${h}</div>`;

    const views = {
      home() {
        main.innerHTML = `<div class="dtiles">${subs.map((s) => tile(s, cnt(s))).join('')}</div><h2 class="dh2">Recent work</h2><div id="drec" class="grid c4"></div>`;
        const box = main.querySelector('#drec'), list = items.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
        if (!list.length) box.outerHTML = `<div class="card dcard dempty"><img src="/assets/art/empty-camera.png" alt=""><div><h3>Nothing here yet</h3><p>${esc((o.pfOpts && o.pfOpts.emptyText) || 'Work will appear here once it has been saved.')}</p></div></div>`;
        else list.forEach((it) => box.appendChild(workCard(it, Object.assign({}, o.pfOpts, { onChange: (n, old) => { if (!n) items.splice(items.indexOf(old), 1); show('home'); } }))));
        if (rep) { const hi = (rep.data.celebrate || [])[0] || rep.data.overview; if (hi) main.insertAdjacentHTML('afterbegin', `<div class="dnote"><img src="/assets/art/sticker-trophy.png" alt=""><b>${esc(CP.fill(hi, name))}</b><a href="#learn" data-go="learn">Read ${esc(name)}'s learning summary →</a></div>`); }
        main.insertAdjacentHTML('afterbegin', `${CP.cal.notice(cal)}<h2 class="dh2" style="margin-top:0">Coming up<a href="#calendar" data-go="calendar" class="dmore">Full calendar →</a></h2>${CP.cal.schedule(cal)}`);
      },
      calendar() {
        main.innerHTML = `${CP.cal.notice(cal)}<h2 class="dh2">The next two weeks</h2>${CP.cal.schedule(cal)}<h2 class="dh2">Term calendar</h2><div class="card dcard" id="dcal"></div>`;
        CP.cal.month(main.querySelector('#dcal'), cal);
      },
      learn() {
        let h = '';
        if (rep) h += CP.reportHtml(rep, name) + (reps.length > 1 ? `<details class="gap"><summary style="cursor:pointer;font-weight:800">Earlier summaries (${reps.length - 1})</summary>${reps.slice(1).map((r) => CP.reportHtml(r, name)).join('<hr>')}</details>` : '');
        else h += `<h3>${esc(name)}'s learning summary will appear here</h3><p>A written summary with next steps and ideas for home is shared from time to time.</p>`;
        if (d.checks) h += `<h3 class="gap">Curriculum progress</h3><div class="grid c2">${CP.SUBJ.map((s) => { const p = CP.progressFor(d.checks, s, y), a = CP.attOf(d.checks, s); return `<div class="card flat"><div class="row"><b class="grow">${s}</b><span class="small mute">${p.secure} of ${p.n} achieved${p.working ? ', ' + p.working + ' in progress' : ''}</span></div>${CP.ckBar(p, true)}${a ? CP.levelMeter(CP.SCALE[a]) : ''}</div>`; }).join('')}</div><p class="small mute">The dark marker shows roughly where we would expect to be at this point in the year.</p>`;
        if (CP.resultsOf(items).length) h += `<h3 class="gap">Test and quiz scores</h3><div class="card flat">${CP.chartResults(items)}</div>`;
        if (items.length) h += `<h3 class="gap">Work saved each month</h3><div class="card flat">${CP.chartMonthly(items)}</div>`;
        main.innerHTML = card(h);
      },
      ideas() {
        if (!rep) { main.innerHTML = card(`<h3>Next steps will appear here</h3><p>When a learning summary is shared, ${esc(name)}'s next steps and ideas to try at home are collected on this page.</p>`); return; }
        const S = rep.data.subjects || {}; let h = `<h3>${o.who === 'family' ? 'Ideas to try at home' : 'My next steps'}</h3>`;
        if ((rep.data.nextStepsOverall || []).length) h += `<ul>${rep.data.nextStepsOverall.map((x) => `<li>${esc(CP.fill(x, name))}</li>`).join('')}</ul>`;
        Object.keys(S).forEach((sub) => { const v = S[sub]; if (!(v.nextSteps || []).length && !(v.homeActivities || []).length) return; h += `<div class="card flat s-${sub} gap" style="border-left:8px solid var(--sc)"><h4>${sub}</h4>${(v.nextSteps || []).length ? `<ul>${v.nextSteps.map((x) => `<li>${esc(CP.fill(x, name))}</li>`).join('')}</ul>` : ''}${(v.homeActivities || []).map((a) => `<p><b>${esc(CP.fill(a.title, name))}</b>${a.minutes ? ` <span class="small mute">(about ${a.minutes} min)</span>` : ''}<br>${esc(CP.fill(a.how || '', name))}</p>`).join('')}</div>`; });
        main.innerHTML = card(h);
      },
      work() { subject(null); },
    };
    function subject(s) {
      const list = items.filter((i) => !s || i.subject === s);
      main.innerHTML = `<div class="row" style="margin-bottom:12px"><h2 class="dh2 grow" style="margin:0">${s || 'All work'}</h2><button class="btn sm" id="dsd">${ICON.dl}<span>Download ${s ? s : 'all work'}</span></button></div><div id="dgrid"></div>`;
      CP.downloadButton(main.querySelector('#dsd'), () => opts(s || undefined));
      const box = main.querySelector('#dgrid');
      if (!list.length) { box.innerHTML = `<div class="card dcard dempty"><img src="/assets/art/empty-work.png" alt=""><div><h3>Nothing in ${esc(s || 'the portfolio')} yet</h3><p>${esc((o.pfOpts && o.pfOpts.emptyText) || 'Work will appear here once it has been saved.')}</p></div></div>`; return; }
      box.className = 'grid c3';
      list.forEach((it) => box.appendChild(workCard(it, Object.assign({}, o.pfOpts, { onChange: (n, old) => { if (!n) items.splice(items.indexOf(old), 1); subject(s); } }))));
    }
    function show(k) {
      root.querySelectorAll('.dside [data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === k));
      if (k.startsWith('s:')) subject(k.slice(2)); else (views[k] || views.home)();
      if (!root.dataset.first) root.dataset.first = 1; else main.scrollIntoView({ block: 'nearest' });
    }
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { e.preventDefault(); show(b.dataset.go); } });
    root.querySelector('#dprint').onclick = () => { show('learn'); setTimeout(() => print(), 150); };
    show('home');
  }
  CP.dashboard = dashboard;
})();
