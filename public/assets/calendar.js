/* Class calendar: month grid, two-week schedule and the teacher notice. Shared by the teacher hub, students and families.
   cal = { events:[{id,date,endDate,time,title,note,kind}], notice:{text,at} }  (dates are plain YYYY-MM-DD) */
(function () {
  const { esc } = CP;
  const KINDS = { event: 'Event', trip: 'Trip / outing', due: 'Due / bring', holiday: 'No school' };
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const pretty = (s) => { const d = parse(s); return DOW[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MON[d.getMonth()].slice(0, 3); };
  const longDay = (s) => { const d = parse(s); return DOW[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
  const range = (e) => (e.endDate && e.endDate !== e.date ? pretty(e.date) + ' – ' + pretty(e.endDate) : pretty(e.date));

  function byDay(cal) {
    const m = {};
    (cal.events || []).forEach((e) => {
      const last = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
      for (let d = parse(e.date), n = 0; ymd(d) <= last && n < 62; d = addDays(d, 1), n++) (m[ymd(d)] = m[ymd(d)] || []).push(e);
    });
    Object.values(m).forEach((a) => a.sort((x, y) => (x.time || '~').localeCompare(y.time || '~')));
    return m;
  }

  const evHtml = (e, withDate) => `<li class="ce k-${e.kind}"><span class="cd"></span><div><b>${esc(e.title)}</b>${e.time ? ` <span class="ct">${esc(e.time)}</span>` : ''}${withDate ? ` <span class="ct">${esc(range(e))}</span>` : ''}${e.kind !== 'event' ? `<span class="ck">${esc(KINDS[e.kind] || '')}</span>` : ''}${e.note ? `<div class="cn">${esc(e.note)}</div>` : ''}</div></li>`;

  /* "This week" + "Next week" (on Sat/Sun it moves on to the coming two weeks) */
  function schedule(cal, o = {}) {
    const today = new Date(), wk = today.getDay() === 0 || today.getDay() === 6 ? mondayOf(addDays(today, 3)) : mondayOf(today);
    const isNow = ymd(wk) === ymd(mondayOf(today)), map = byDay(cal), t = ymd(today);
    const week = (start, title) => {
      let rows = '', any = false;
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i), k = ymd(d), evs = map[k] || [];
        if (i >= 5 && !evs.length) continue;
        if (evs.length) any = true;
        rows += `<div class="cday${k === t ? ' today' : ''}${evs.some((e) => e.kind === 'holiday') ? ' off' : ''}"><div class="cdl"><b>${DOW[i]}</b><span>${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}</span></div>${evs.length ? `<ul>${evs.map((e) => evHtml(e)).join('')}</ul>` : '<div class="cnone">Nothing special</div>'}</div>`;
      }
      return `<div class="card dcard cweek"><h3>${title}<small>${pretty(ymd(start))} – ${pretty(ymd(addDays(start, 4)))}</small></h3>${rows}${any ? '' : ''}</div>`;
    };
    return `<div class="cwrap"><div class="grid c2">${week(wk, isNow ? 'This week' : 'Coming week')}${week(addDays(wk, 7), isNow ? 'Next week' : 'The week after')}</div></div>`;
  }

  function notice(cal) {
    const n = cal && cal.notice;
    if (!n || !n.text) return '';
    return `<div class="dnotice"><div class="nh">Notice from your teacher</div><div class="nb">${esc(n.text).replace(/\n/g, '<br>')}</div>${n.at ? `<div class="ns">Updated ${esc(CP.fmtDate(n.at))}</div>` : ''}</div>`;
  }

  /* Month grid. o: { onPick(dateStr), onEvent(evt), selected } */
  function month(box, calArg, o = {}) {
    const getCal = typeof calArg === 'function' ? calArg : () => calArg;
    let cur = new Date(); cur = new Date(cur.getFullYear(), cur.getMonth(), 1, 12);
    let sel = o.selected || ymd(new Date());
    const draw = () => {
      const cal = getCal(), map = byDay(cal), t = ymd(new Date()), first = cur, start = mondayOf(first), mo = first.getMonth();
      let cells = '';
      for (let i = 0; i < 42; i++) {
        const d = addDays(start, i), k = ymd(d), evs = map[k] || [];
        if (i >= 35 && d.getMonth() !== mo) break;
        const hol = evs.some((e) => e.kind === 'holiday');
        cells += `<button type="button" class="cc${d.getMonth() !== mo ? ' out' : ''}${k === t ? ' today' : ''}${k === sel ? ' sel' : ''}${hol ? ' off' : ''}${i % 7 > 4 ? ' we' : ''}" data-d="${k}" aria-label="${esc(longDay(k))}${evs.length ? ', ' + evs.length + ' event' + (evs.length > 1 ? 's' : '') : ''}"><span class="cnum">${d.getDate()}</span>${evs.slice(0, 3).map((e) => `<span class="cchip k-${e.kind}" data-e="${e.id}">${esc(e.title)}</span>`).join('')}${evs.length > 3 ? `<span class="cmore">+${evs.length - 3} more</span>` : ''}</button>`;
      }
      const evs = (map[sel] || []);
      box.innerHTML = `<div class="cmon"><div class="cmh"><button type="button" class="btn sm" data-n="-1" aria-label="Previous month">‹</button><b>${MON[mo]} ${first.getFullYear()}</b><button type="button" class="btn sm" data-n="1" aria-label="Next month">›</button><button type="button" class="btn sm" data-n="0">Today</button></div>
        <div class="cgrid">${DOW.map((x) => `<div class="cdw">${x}</div>`).join('')}${cells}</div>
        <div class="cdetail"><h4>${esc(longDay(sel))}</h4>${evs.length ? `<ul>${evs.map((e) => evHtml(e)).join('')}</ul>` : '<p class="mute small" style="margin:4px 0 0">Nothing on this day.</p>'}</div></div>`;
      box.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { const n = Number(b.dataset.n); cur = n ? new Date(cur.getFullYear(), cur.getMonth() + n, 1, 12) : new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12); draw(); }));
      box.querySelectorAll('.cc').forEach((c) => (c.onclick = (e) => {
        const chip = e.target.closest('[data-e]'); sel = c.dataset.d;
        if (chip && o.onEvent) { o.onEvent((getCal().events || []).find((x) => x.id === chip.dataset.e)); }
        else if (o.onPick) o.onPick(sel);
        draw();
      }));
    };
    draw();
    return { redraw: draw, select: (d) => { sel = d; cur = new Date(parse(d).getFullYear(), parse(d).getMonth(), 1, 12); draw(); } };
  }

  /* Upcoming list used in the teacher hub */
  function upcomingList(cal) {
    const t = ymd(new Date()), list = (cal.events || []).filter((e) => (e.endDate || e.date) >= t);
    return list;
  }

  CP.cal = { KINDS, ymd, parse, pretty, longDay, range, schedule, notice, month, upcomingList, byDay };
})();
