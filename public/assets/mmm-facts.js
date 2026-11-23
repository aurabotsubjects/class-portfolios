/* Mad Maths Minute — the "Maths Facts" page inside a student's / family's portfolio dashboard.
   CP.mmmView(main, d, { who:'student'|'family', token:()=>jwt, onSaved(mmm) })  — d.mmm comes from /api/my or /api/family. */
(function () {
  const { esc } = CP;
  const M = () => window.MMM;
  const pct = (sk) => Math.max(0, Math.min(100, Math.round(((sk - M().FIRST) / (M().LAST - M().FIRST + 1)) * 100)));
  const day = (d) => M().fmtDay(d);

  function bfChart(att) { // correct answers per attempt (oldest → newest)
    const a = att.slice().reverse().slice(-12);
    if (!a.length) return '';
    const W = 640, H = 200, L = 34, T = 12, B = 30, bw = Math.min(46, (W - L) / a.length - 8);
    const y = (v) => T + (H - T - B) * (1 - v / 100);
    let g = [0, 50, 100].map((v) => `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="#d8cfba"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#6b6459">${v}</text>`).join('');
    a.forEach((s, i) => {
      const x = L + 10 + i * ((W - L - 14) / a.length);
      g += `<rect x="${x}" y="${y(s.score)}" width="${bw}" height="${y(0) - y(s.score)}" rx="5" fill="${s.score >= 90 ? '#a8e6a1' : s.score >= 70 ? '#ffd966' : '#ffb3a0'}" stroke="#1b1b1b" stroke-width="1.6"><title>T${s.term} W${s.week}: ${s.score}/${s.total}</title></rect><text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" font-size="10.5" fill="#6b6459">T${s.term}W${s.week}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Basic Facts scores">${g}</svg>`;
  }

  function view(main, d, o = {}) {
    const m = d.mmm || {}, name = CP.firstName(d.student.name), student = o.who === 'student';
    const full = d.student.name;
    const skillScores = (m.scores || []).filter((s) => s.kind === 'skill');
    const basic = (m.scores || []).filter((s) => s.kind === 'basic');
    let h = '';
    if (!m.mode) {
      h = `<div class="card dcard"><h3>Mad Maths Minute</h3><p>${esc(name)}'s Mad Maths Minute level hasn't been set yet. Check back soon.</p></div>`;
      main.innerHTML = h; return;
    }
    if (m.mode === 'skill') {
      const sk = m.skill, info = M().D[sk] || {};
      const last = skillScores[0];
      h += `<div class="card dcard" style="background:var(--cream)"><div class="row" style="align-items:flex-start;gap:18px">
        <div style="background:var(--char);color:var(--cream);border-radius:22px;padding:14px 22px;text-align:center;min-width:130px;border-bottom:8px solid ${M().bandOf(sk)}"><div class="small" style="opacity:.75;font-weight:700">Mad Maths Minute</div><div style="font-size:3rem;font-weight:900;line-height:1;letter-spacing:-.04em">Skill ${sk}</div></div>
        <div class="grow" style="min-width:220px"><h3 style="margin:0 0 4px">${esc(name)} is learning to…</h3><p style="margin:0 0 10px"><b>${esc(info.goal || '')}</b>${info.eg ? `<br><span class="small mute">e.g. ${esc(info.eg)}</span>` : ''}</p>
          <div style="height:14px;background:#e6dcc4;border-radius:99px;overflow:hidden;border:2px solid var(--char)"><i style="display:block;height:100%;width:${pct(sk)}%;background:var(--orange)"></i></div>
          <div class="small mute" style="margin-top:4px">Skill ${sk} of ${M().LAST} — then on to Basic Facts</div></div></div>
        <p style="margin:14px 0 0">${last ? `Last Mad Minute: <b>${last.score}/15</b> on ${esc(day(last.day))}. ` : ''}${last && last.score >= 15 ? '' : `To move up, get <b>15 out of 15</b> in one minute.`}</p>
        <div class="row gap"><button class="btn pri" id="mfPrac">Print this week's practice sheet</button><span class="small mute">Work in pencil for one minute, then finish in pen.</span></div></div>`;
      if (skillScores.length) {
        h += `<h3 class="gap" style="color:var(--cream)">${esc(name)}'s Mad Minute scores</h3><div class="card dcard" style="background:var(--cream)">${M().scoreChart(skillScores)}<p class="small mute" style="margin:6px 0 0">Green dots are the times ${esc(name)} moved up a skill. The dashed line is 15/15.</p></div>
          <div class="card dcard gap" style="background:var(--cream)"><table style="width:100%;border-collapse:collapse;font-size:.95rem"><thead><tr style="text-align:left"><th>Date</th><th>Skill</th><th>Score</th><th></th></tr></thead><tbody>${skillScores.slice(0, 20).map((s) => `<tr style="border-top:1px solid #d8cfba"><td style="padding:6px 0">${esc(day(s.day))}</td><td>Skill ${s.skill}</td><td><b>${s.score}</b>/15</td><td>${s.advanced ? '⭐ moved up' : ''}</td></tr>`).join('')}</tbody></table></div>`;
      }
    } else { // basic facts
      const W = M().bfWeeks(m.term || 1);
      h += `<div class="card dcard" style="background:var(--cream)"><div class="row" style="align-items:flex-start;gap:18px">
        <div style="background:var(--char);color:var(--cream);border-radius:22px;padding:14px 22px;text-align:center;min-width:130px;border-bottom:8px solid var(--orange)"><div class="small" style="opacity:.75;font-weight:700">Mad Maths Minute</div><div style="font-size:2.1rem;font-weight:900;line-height:1.05;letter-spacing:-.03em">Basic<br>Facts</div></div>
        <div class="grow" style="min-width:220px"><h3 style="margin:0 0 4px">${esc(name)} has finished the Mad Minute skills 🎉</h3><p style="margin:0 0 6px">Now on <b>Term ${m.term || 1}, Week ${m.week || 1}</b>: 100 mixed + − × ÷ facts in 5 minutes.</p>
          <p class="small mute" style="margin:0">Each test has 100 questions. The goal is to get more right, and to get them faster.</p></div></div>
        <div class="row gap" style="align-items:flex-end">
          <div><label class="small" for="mfT">Term</label><select id="mfT">${[1, 2, 3, 4].map((t) => `<option ${t === (m.term || 1) ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div><label class="small" for="mfW">Week</label><select id="mfW">${W.map((w) => `<option ${w === (m.week || 1) ? 'selected' : ''}>${w}</option>`).join('')}</select></div>
          ${student ? '<button class="btn pri" id="mfGo">Start the 5-minute test</button>' : ''}
          <button class="btn" id="mfPrint">Print practice sheet</button></div></div>`;
      if (basic.length) {
        h += `<h3 class="gap" style="color:var(--cream)">${esc(name)}'s Basic Facts scores</h3><div class="card dcard" style="background:var(--cream)">${bfChart(basic)}</div>
          <div class="card dcard gap" style="background:var(--cream)"><table style="width:100%;border-collapse:collapse;font-size:.95rem"><thead><tr style="text-align:left"><th>Date</th><th>Test</th><th>Correct</th><th>Time</th></tr></thead><tbody>${basic.slice(0, 20).map((s) => `<tr style="border-top:1px solid #d8cfba"><td style="padding:6px 0">${esc(day(s.day))}</td><td>Term ${s.term}, Week ${s.week}</td><td><b>${s.score}</b>/${s.total}</td><td>${esc(M().fmtTime(s.seconds || 0))}${s.timedOut ? ' (time up)' : ''}</td></tr>`).join('')}</tbody></table></div>`;
      }
    }
    main.innerHTML = h;
    const q = (s) => main.querySelector(s);
    if (q('#mfPrac')) q('#mfPrac').onclick = () => M().openPrint({ title: `Skill ${m.skill} practice — ${full}`, pages: M().practicePages([{ skill: m.skill, name: full }]) });
    if (q('#mfT')) {
      q('#mfT').onchange = () => { const w = M().bfWeeks(+q('#mfT').value); q('#mfW').innerHTML = w.map((x) => `<option>${x}</option>`).join(''); };
      q('#mfPrint').onclick = () => M().openPrint({ title: `Basic Facts — ${full}`, pages: M().bfPages([{ term: +q('#mfT').value, week: +q('#mfW').value, name: full }]) });
    }
    if (q('#mfGo')) q('#mfGo').onclick = () => quiz(d, +q('#mfT').value, +q('#mfW').value, o);
  }

  // ---------- Basic Facts test: 100 questions, 5 minutes ----------
  function quiz(d, term, week, o) {
    const qs = M().bfQuestions(term, week).slice();
    if (!qs.length) { CP.toast('That test is not available'); return; }
    const TOTAL = 300;
    let i = 0, right = 0, wrong = 0, left = TOTAL, t0 = Date.now(), timer = null, locked = false, done = false;
    const el = document.createElement('div');
    el.className = 'modal'; el.style.zIndex = 90; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="card" style="width:min(560px,96vw);padding:22px;text-align:center" id="bfBox"></div>`;
    document.body.appendChild(el);
    const box = el.querySelector('#bfBox');
    const clock = () => `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    function ask() {
      if (i >= qs.length) return end(false);
      locked = false;
      box.innerHTML = `<div class="row"><b class="grow" style="text-align:left">Question ${i + 1} of ${qs.length}</b><b id="bfClock" style="font-size:1.3rem">${clock()}</b><button class="btn sm" id="bfQuit" aria-label="Stop">Stop</button></div>
        <div style="height:12px;background:#e6dcc4;border-radius:99px;overflow:hidden;margin:10px 0 22px;border:2px solid var(--char)"><i id="bfBar" style="display:block;height:100%;width:${(left / TOTAL) * 100}%;background:${left <= 60 ? '#e63a0e' : 'var(--orange)'}"></i></div>
        <div id="bfQ" style="font-size:3rem;font-weight:900;letter-spacing:-.03em;margin:8px 0 16px">${esc(M().bfText(qs[i]))} = ?</div>
        <input id="bfIn" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Your answer" style="font-size:2.2rem;text-align:center;width:9ch;padding:8px">
        <div id="bfFb" style="height:34px;font-weight:800;font-size:1.15rem;margin-top:8px"></div>
        <button class="btn pri" id="bfOk">Check</button>`;
      const inp = box.querySelector('#bfIn');
      inp.focus();
      inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
      box.querySelector('#bfOk').onclick = submit;
      box.querySelector('#bfQuit').onclick = () => { if (confirm('Stop this test? Your score so far will be saved.')) end(false); };
    }
    function submit() {
      if (locked || done) return;
      const inp = box.querySelector('#bfIn'), v = inp.value.trim();
      if (v === '') return;
      locked = true;
      const ans = M().bfSolve(qs[i]), fb = box.querySelector('#bfFb');
      if (Number(v) === ans) { right++; fb.textContent = '✓ Correct!'; fb.style.color = '#2e7d32'; } else { wrong++; fb.textContent = '✗ The answer is ' + ans; fb.style.color = '#c62828'; }
      i++;
      setTimeout(ask, Number(v) === ans ? 400 : 900);
    }
    function tick() {
      left--;
      const c = box.querySelector('#bfClock'), b = box.querySelector('#bfBar');
      if (c) c.textContent = clock();
      if (b) { b.style.width = (left / TOTAL) * 100 + '%'; if (left <= 60) b.style.background = '#e63a0e'; }
      if (left <= 0) end(true);
    }
    async function end(timedOut) {
      if (done) return; done = true;
      clearInterval(timer);
      const secs = timedOut ? TOTAL : Math.min(TOTAL, Math.floor((Date.now() - t0) / 1000)), att = right + wrong;
      const p = att ? Math.round((right / att) * 100) : 0;
      const [em, ti] = timedOut ? [p >= 80 ? '⏱️' : '⏰', "Time's up!"] : p === 100 ? ['🏆', 'Perfect score!'] : p >= 80 ? ['🎉', 'Great work!'] : p >= 60 ? ['👍', 'Good effort!'] : ['💪', 'Keep practising!'];
      box.innerHTML = `<div style="font-size:3.4rem">${em}</div><h2 style="margin:4px 0">${ti}</h2><p class="mute">You answered ${att} of ${qs.length} questions</p>
        <div class="row" style="justify-content:center;gap:26px;margin:14px 0"><div><div style="font-size:2rem;font-weight:900">${right}/100</div><div class="small mute">correct</div></div><div><div style="font-size:2rem;font-weight:900">${p}%</div><div class="small mute">accuracy</div></div><div><div style="font-size:2rem;font-weight:900">${M().fmtTime(secs)}</div><div class="small mute">time</div></div></div>
        <p id="bfSave" class="small mute">Saving your score…</p><button class="btn pri" id="bfClose" disabled>Done</button>`;
      const close = box.querySelector('#bfClose');
      try {
        const r = await CP.api('mmm/basic', { method: 'POST', token: o.token && o.token(), body: { term, week, correct: right, attempted: att, seconds: secs, timedOut } });
        box.querySelector('#bfSave').textContent = 'Saved to your portfolio ✓';
        d.mmm = r.mmm; if (o.onSaved) o.onSaved(r.mmm);
      } catch (e) { box.querySelector('#bfSave').textContent = 'Your score could not be saved: ' + e.message; }
      close.disabled = false;
      close.onclick = () => { el.remove(); if (o.onSaved) o.onSaved(d.mmm); };
    }
    timer = setInterval(tick, 1000);
    ask();
  }

  CP.mmmView = view;
  CP.mmmLabel = (m) => (!m || !m.mode ? '' : m.mode === 'basic' ? 'Basic Facts' : 'Skill ' + m.skill);
})();
