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
.sl .w b{flex:1;font-weight:600}
.sl .w s{display:block;width:6.2mm;height:6.2mm;border:.5mm solid #1b1b1b;border-radius:1.4mm;background:#fff}
.sl .ft{display:flex;justify-content:flex-end;align-items:center;gap:2mm;font-size:8.5pt;font-weight:800;margin-top:1mm}
.sl .ft span{display:inline-block;width:14mm;height:6mm;border:.5mm solid #1b1b1b;border-radius:1.4mm}
</style>`;
  const fit = (n) => { const l = String(n || '').length; return l > 26 ? 12 : l > 20 ? 14 : l > 14 ? 16.5 : 19; };
  function slip(it) {
    const ws = (it.words || []).slice(0, 10);
    while (ws.length < 10) ws.push('');
    return `<div class="sl"><div class="hd"><div class="nm" style="font-size:${fit(it.name)}pt">${esc(it.name) || '&nbsp;'}</div><div class="tg">${esc(it.label || 'Spelling')}</div><div class="wk">Week ${esc(it.week || '')}</div></div>
      <div class="ws">${ws.map((w, i) => `<div class="w"><i>${i + 1}</i><b>${esc(w)}</b>${w ? '<s></s>' : ''}</div>`).join('')}</div>
      <div class="ft">Total correct <span></span> / 10</div></div>`;
  }
  function testPages(items) {
    const out = [];
    for (let i = 0; i < items.length; i += 5) out.push(CSS + `<div class="sp">${items.slice(i, i + 5).map(slip).join('')}${'<div class="sl"></div>'.repeat(Math.max(0, 5 - items.slice(i, i + 5).length))}</div>`);
    return out;
  }
  window.SPELL = { testPages, esc };
})();
