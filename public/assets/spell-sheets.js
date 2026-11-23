/* Spelling — paper test slips: five to an A4 page (cut them apart), one per student, name printed on each.
   window.SPELL.testPages([{name,label,week,words}]) -> page HTML strings for MMM.openPrint({title,pages}). */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `<style>
.sp{width:210mm;height:297mm;page-break-after:always;break-after:page;overflow:hidden;display:flex;flex-direction:column;background:#fff;font-family:Poppins,"Avenir Next","Helvetica Neue",Arial,sans-serif;color:#1b1b1b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sp:last-child{page-break-after:auto;break-after:auto}
.sl{flex:1 1 0;min-height:0;padding:3.2mm 10mm 2.6mm;border-bottom:.35mm dashed #8a8372;position:relative;display:flex;flex-direction:column}
.sl:last-child{border-bottom:0}
.sl .hd{display:flex;align-items:flex-end;gap:5mm;margin-bottom:1.6mm}
.sl .nm{font-weight:900;letter-spacing:-.02em;line-height:1;border-bottom:.5mm solid #1b1b1b;padding-bottom:.6mm;flex:1;white-space:nowrap;overflow:hidden}
.sl .tg{font-size:8.5pt;font-weight:700;white-space:nowrap;background:#1b1b1b;color:#fff3e0;border-radius:99px;padding:.6mm 3.2mm}
.sl .wk{font-size:8.5pt;font-weight:700;white-space:nowrap}
.sl .ws{flex:1;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:column;grid-template-rows:repeat(5,1fr);column-gap:10mm}
.sl .w{display:flex;align-items:center;gap:3mm;border-bottom:.2mm solid #d8cfba;font-size:13pt;font-weight:600}
.sl .w i{font-style:normal;font-size:8.5pt;font-weight:800;color:#8a8372;width:5mm;text-align:right}
.sl .w b{flex:1;font-weight:600;color:#1b1b1b}
.sl .w b u.tr{text-decoration:underline;text-decoration-thickness:.45mm;text-underline-offset:1.1mm;text-decoration-color:#1b1b1b}
.sl .tn{font-size:7.5pt;font-weight:700;color:#6b6459;margin-right:auto}
.sl .w s{display:block;width:6.2mm;height:6.2mm;border:.5mm solid #1b1b1b;border-radius:1.4mm;background:#fff}
.sl .ft{display:flex;justify-content:flex-end;align-items:center;gap:2mm;font-size:8.5pt;font-weight:800;margin-top:1mm}
.sl .ft span{display:inline-block;width:14mm;height:6mm;border:.5mm solid #1b1b1b;border-radius:1.4mm}
</style>`;

  // ---------- tricky parts: silent letters, irregular sounds, easy-to-miss letters ----------
  // Returns a boolean per letter; true = underline it.
  const SPECIAL = { // word -> letter groups that trip people up (first match of each)
    february: ['br', 'ar'], wednesday: ['d'], library: ['br', 'ar'], necessary: ['c', 'ss'], separate: ['par'], definite: ['ini'], environment: ['nm'],
    government: ['nm'], interesting: ['ter'], vegetable: ['eta'], different: ['ff', 'er'], business: ['si'], island: ['s'], rhythm: ['rh', 'th'],
    beautiful: ['eau'], beauty: ['eau'], busy: ['u'], building: ['ui'], muscle: ['sc'], knowledge: ['ow'], actually: ['ally'], probably: ['ob'], sincerely: ['ere'],
    disappear: ['s', 'pp'], disappeared: ['s', 'pp'], disappoint: ['s', 'pp'], embarrass: ['rr', 'ss'], accommodate: ['cc', 'mm'], occasion: ['cc', 's'], address: ['dd', 'ss'],
    tomorrow: ['m', 'rr'], excited: ['xc'], exercise: ['ise'], extreme: ['eme'], difficult: ['ff'], experience: ['ie'], decide: ['ci'], describe: ['sc'],
    everybody: ['ery'], everywhere: ['ery', 'ere'], every: ['ery'], favourite: ['ou', 'ite'], interest: ['ter'], calendar: ['ar'], grammar: ['ar'], sugar: ['ar'], popular: ['ar'],
    similar: ['ar'], regular: ['ar'], particular: ['ar'], vinegar: ['ar'], again: ['ai'], against: ['ai'], said: ['ai'], friend: ['ie'], their: ['ei'], they: ['ey'], though: ['ough'], through: ['ough'],
    thought: ['ough'], bought: ['ough'], brought: ['ough'], enough: ['ough'], cough: ['ough'], laugh: ['augh'], daughter: ['augh'], eight: ['eigh'], weigh: ['eigh'], neighbour: ['eigh', 'ou'],
    height: ['eigh'], straight: ['aigh'], answer: ['w'], two: ['w'], sword: ['w'], who: ['wh'], whole: ['wh'], whose: ['wh'], cupboard: ['p'], receipt: ['p'], raspberry: ['p'],
    handsome: ['d'], sandwich: ['d'], castle: ['t'], listen: ['t'], often: ['t'], whistle: ['t'], christmas: ['t', 'chr'], school: ['ch'], chorus: ['ch'], character: ['ch'], chemist: ['ch'],
    chemical: ['ch'], chaos: ['ch'], echo: ['ch'], stomach: ['ch'], orchestra: ['ch'], anchor: ['ch'], choir: ['ch'], machine: ['ch'], chef: ['ch'], parachute: ['ch'], brochure: ['ch'],
    technique: ['ch', 'que'], schedule: ['sch'], ache: ['ch'], mountain: ['ain'], decorate: [], one: ['o'], once: ['o'], love: ['o'], above: ['o'], come: ['o'], some: ['o'], done: ['o'],
    none: ['o'], month: ['o'], mother: ['o'], brother: ['o'], other: ['o'], another: ['o'], nothing: ['o'], son: ['o'], wonder: ['o'], monkey: ['o'], honey: ['o'], money: ['o'], front: ['o'],
    country: ['ou'], young: ['ou'], touch: ['ou'], double: ['ou'], trouble: ['ou'], cousin: ['ou'], couple: ['ou'], rough: ['ough'], tough: ['ough'], courage: ['ou'], was: ['a'], want: ['a'],
    watch: ['a'], wash: ['a'], swan: ['a'], wander: ['a'], what: ['a'], quality: ['a'], quantity: ['a'], do: ['o'], move: ['o'], prove: ['o'], lose: ['o'], shoe: ['oe'], put: ['u'], push: ['u'],
    pull: ['u'], full: ['u'], bush: ['u'], bury: ['u'], build: ['ui'], built: ['ui'], biscuit: ['ui'], circuit: ['ui'], guess: ['u'], guest: ['u'], guide: ['u'], guard: ['u'], guitar: ['u'],
    breath: ['ea'], breakfast: ['ea'], bread: ['ea'], dead: ['ea'], deaf: ['ea'], death: ['ea'], head: ['ea'], health: ['ea'], heaven: ['ea'], heavy: ['ea'], instead: ['ea'], jealous: ['ea'],
    leather: ['ea'], feather: ['ea'], meant: ['ea'], measure: ['ea'], pleasure: ['ea'], treasure: ['ea'], ready: ['ea'], spread: ['ea'], steady: ['ea'], sweat: ['ea'], thread: ['ea'],
    threat: ['ea'], weather: ['ea'], wealth: ['ea'], weapon: ['ea'], great: ['ea'], break: ['ea'], steak: ['ea'], bear: ['ear'], pear: ['ear'], wear: ['ear'], swear: ['ear'], tear: ['ear'],
    heart: ['ear'], learn: ['ear'], early: ['ear'], earth: ['ear'], search: ['ear'], pearl: ['ear'], rehearse: ['ear'], bicycle: ['cy'], chocolate: ['o'], complete: [],
    continue: ['ue'], accident: ['cc'], afraid: ['ai'], august: ['au'], breathe: ['ea'], divide: [], easy: [], equal: ['qu'], adventure: ['ture'], colour: ['ou'], favour: ['ou'],
    queue: ['ueue'], minute: ['ute'], lightning: ['igh'], sure: ['s'], eyes: ['ey'], eye: ['ey'], gauge: ['au'], tongue: ['ue'], league: ['ue'], vague: ['ue'], unique: ['que'],
    guarantee: ['u'], vehicle: ['h'], ghost: ['h'], rhyme: ['h'], honest: ['h'], hour: ['h'], heir: ['h'], honour: ['h', 'ou'], exhaust: ['h'], psychology: ['p'], pneumonia: ['p'],
  };
  const RULES = [ // [regex, which capture group (default whole match)]
    [/^(k)n/], [/^(w)r/], [/^(g)n/], [/gn(?=$|ed$|ing$)/, 0, 0, 1], [/(b)t(?!h)/], [/m(b)(?=$|ing$|ed$|s$)/], [/(m)n$/], [/mn(?=$|s$)/, 1],
    [/o(ul)d/, 1], [/a(l)[kmf]/], [/ough/], [/augh/], [/eigh/], [/[aeiou]?(gh)t/], [/(?:t|s|c|x)ion/], [/ssion/], [/cian/], [/(?:t|c)ial/], [/(?:t|c)ious/], [/ture\b/], [/ph/],
    [/ie(?!s$|d$|r$|r?s$)/], [/ei(?!ng)/], [/sc(?=[eiy])/], [/(?<=[^aeiouy])(y)(?=[^aeiouy]{1,2}(?:[aeiou]|$))/],
  ];
  function tricky(word) {
    const raw = String(word || ''), w = raw.toLowerCase(), m = new Array(w.length).fill(false);
    const mark = (a, b) => { for (let i = a; i < b && i < m.length; i++) m[i] = true; };
    const sp = SPECIAL[w];
    if (sp && sp.length) { sp.forEach((g) => { const i = w.indexOf(g); if (i > -1) mark(i, i + g.length); }); return m; }
    if (Object.prototype.hasOwnProperty.call(SPECIAL, w)) return m; // reviewed: nothing tricky
    RULES.forEach(([re, grp]) => {
      const x = re.exec(w); if (!x) return;
      if (x.length > 1 && x[1] !== undefined && grp !== 0) { const off = x.index + x[0].indexOf(x[1], 0); mark(off, off + x[1].length); }
      else mark(x.index, x.index + x[0].length);
    });
    return m;
  }
  const trickyHtml = (word) => {
    const m = tricky(word), w = String(word || ''); let out = '', open = false;
    for (let i = 0; i < w.length; i++) { if (m[i] && !open) { out += '<u class="tr">'; open = true; } if (!m[i] && open) { out += '</u>'; open = false; } out += esc(w[i]); }
    return out + (open ? '</u>' : '');
  };
  const fit = (n) => { const l = String(n || '').length; return l > 26 ? 12 : l > 20 ? 14 : l > 14 ? 16.5 : 19; };
  function slip(it) {
    const ws = (it.words || []).slice(0, 10);
    while (ws.length < 10) ws.push('');
    return `<div class="sl"><div class="hd"><div class="nm" style="font-size:${fit(it.name)}pt">${esc(it.name) || '&nbsp;'}</div><div class="tg">${esc(it.label || 'Spelling')}</div><div class="wk">Week ${esc(it.week || '')}</div></div>
      <div class="ws">${ws.map((w, i) => `<div class="w"><i>${i + 1}</i><b>${it.tricky ? trickyHtml(w) : esc(w)}</b>${w ? '<s></s>' : ''}</div>`).join('')}</div>
      <div class="ft">${it.tricky ? '<span class="tn" style="border:0;width:auto;height:auto"><u class="tr" style="text-decoration:underline;text-decoration-thickness:.4mm">Underlined</u> = a tricky part to remember</span>' : ''}Total correct <span></span> / 10</div></div>`;
  }
  function testPages(items) {
    const out = [];
    for (let i = 0; i < items.length; i += 5) out.push(CSS + `<div class="sp">${items.slice(i, i + 5).map(slip).join('')}${'<div class="sl"></div>'.repeat(Math.max(0, 5 - items.slice(i, i + 5).length))}</div>`);
    return out;
  }
  window.SPELL = { testPages, esc, tricky, trickyHtml };
})();
