/* "Add to portfolio" — take or choose a photo, write notes, pick a topic.
   CP.addWork({ token, who:'student'|'teacher', students:[{id,name}], studentId, subject, onDone }) */
(function () {
  const { esc, CFG, toast } = CP;
  const css = `.aw .sec{margin-top:14px}.aw label.l{display:block;font-weight:800;margin-bottom:6px}
.aw .pick{display:flex;gap:10px;flex-wrap:wrap}.aw .pick .btn{flex:1 1 180px;justify-content:center;min-height:52px;font-size:1.02rem}
.aw .thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px}
.aw .th{position:relative;border:2.5px solid var(--char);border-radius:14px;overflow:hidden;aspect-ratio:1;background:#fff;display:grid;place-items:center;font-weight:700;font-size:.8rem;text-align:center;padding:4px;word-break:break-all}
.aw .th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.aw .th button{position:absolute;top:4px;right:4px;width:28px;height:28px;border-radius:99px;border:0;background:var(--char);color:#fff;font-weight:900;cursor:pointer;line-height:1;z-index:1}
.aw .chips{display:flex;gap:8px;flex-wrap:wrap}.aw .chip{border:2.5px solid var(--char);background:#fff;color:var(--char);border-radius:99px;padding:9px 18px;font:800 1rem Poppins,sans-serif;cursor:pointer}
.aw .chip[aria-pressed=true]{background:var(--orange,#ff4a1c);color:#fff;border-color:var(--char);box-shadow:0 3px 0 var(--char)}
.aw textarea,.aw input[type=text],.aw select{width:100%;font:600 1rem Poppins,sans-serif;padding:10px 12px;border:2.5px solid var(--char);border-radius:14px;background:#fff;color:#1b1b1b;box-sizing:border-box}
.aw textarea{min-height:96px;resize:vertical}.aw .cnt{font-size:.8rem;opacity:.7;text-align:right}
.aw video{width:100%;border-radius:14px;background:#000;max-height:50vh}`;
  const SUPPORTED = 'image/*,video/*,audio/*,application/pdf,text/plain';
  const touch = () => matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

  // Keep photos readable (1800px on the long edge) but small: re-compress until each is about 500 KB or less
  async function shrink(f) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f;
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
      const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      if (k === 1 && f.size < 350 * 1024) return f;
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      let q = 0.82, blob;
      for (;;) { blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q)); if (!blob || blob.size <= 500 * 1024 || q <= 0.6) break; q -= 0.06; }
      return blob && blob.size < f.size ? new File([blob], (f.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
    } catch { return f; }
  }

  function addWork(o) {
    if (!document.getElementById('awCss')) { const s = document.createElement('style'); s.id = 'awCss'; s.textContent = css; document.head.appendChild(s); }
    const teacher = o.who === 'teacher', subs = CFG.subjects.slice();
    const studs = (o.students || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    let files = [], subject = subs.includes(o.subject) ? o.subject : '', stream = null, busy = false;
    const m = document.createElement('div');
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.style.zIndex = 70;
    m.innerHTML = `<div class="card aw" style="width:min(580px,96vw);max-height:94vh;overflow:auto;background:var(--cream,#fff);color:#1b1b1b">
      <div class="row"><h3 class="grow" style="margin:0">📷 Add to portfolio</h3><button class="btn sm" id="awX">Close</button></div>
      ${teacher ? `<div class="sec"><label class="l" for="awS">Which student?</label><select id="awS"><option value="">Choose a student…</option>${studs.map((s) => `<option value="${esc(s.id)}" ${s.id === o.studentId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>` : ''}
      <div class="sec"><label class="l">Photo</label>
        <div class="pick"><button class="btn pri" id="awCam" type="button">📷 Take a photo</button><button class="btn" id="awPick" type="button">🖼️ ${teacher ? 'Choose photo or file' : 'Choose a photo'}</button></div>
        <input type="file" id="awCamIn" accept="image/*" capture="environment" hidden><input type="file" id="awFileIn" accept="${SUPPORTED}" multiple hidden>
        <div id="awLive" hidden><video id="awVid" playsinline muted></video><div class="row" style="margin-top:8px;gap:8px"><button class="btn pri grow" id="awSnap" type="button">Snap!</button><button class="btn" id="awStop" type="button">Cancel</button></div></div>
        <div class="thumbs" id="awTh"></div></div>
      <div class="sec"><label class="l">Which topic?</label><div class="chips" id="awSub">${subs.map((s) => `<button type="button" class="chip" data-s="${esc(s)}" aria-pressed="${s === subject}">${esc(s)}</button>`).join('')}</div></div>
      <div class="sec"><label class="l" for="awTi">Title <span style="font-weight:600;opacity:.65">(optional)</span></label><input type="text" id="awTi" maxlength="80" placeholder="e.g. My fraction wall"></div>
      <div class="sec"><label class="l" for="awNo">Notes</label><textarea id="awNo" maxlength="500" placeholder="${teacher ? 'What was the learning? Add an observation or comment…' : 'Tell us about your work. What did you do? What are you proud of?'}"></textarea><div class="cnt" id="awCnt">0 / 500</div></div>
      <div class="row gap"><button class="btn pri grow" id="awGo" type="button" disabled>Save to portfolio</button></div>
      <p class="small mute" id="awMsg" style="margin:8px 0 0"></p></div>`;
    document.body.appendChild(m);
    const $ = (s) => m.querySelector(s);
    const close = () => { stopLive(); m.remove(); };
    function stopLive() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } $('#awLive').hidden = true; }
    function check() {
      const ok = files.length && subject && (!teacher || $('#awS').value) && !busy;
      $('#awGo').disabled = !ok;
      $('#awMsg').textContent = busy ? '' : !files.length ? 'Add a photo to begin.' : !subject ? 'Pick a topic.' : teacher && !$('#awS').value ? 'Choose a student.' : '';
    }
    function drawThumbs() {
      $('#awTh').innerHTML = files.map((f, i) => `<div class="th" data-i="${i}">${/^image\//.test(f.type) ? `<img alt="" src="${f._u || (f._u = URL.createObjectURL(f))}">` : esc(f.name)}<button type="button" aria-label="Remove" data-x="${i}">×</button></div>`).join('');
      $('#awTh').querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => { files.splice(+b.dataset.x, 1); drawThumbs(); check(); }));
      check();
    }
    const addFiles = (list) => { files = files.concat([...list]).slice(0, 12); drawThumbs(); };
    $('#awX').onclick = close;
    m.addEventListener('mousedown', (e) => { if (e.target === m && !busy) close(); });
    $('#awPick').onclick = () => $('#awFileIn').click();
    $('#awFileIn').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
    $('#awCamIn').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
    $('#awCam').onclick = async () => {
      if (touch() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return $('#awCamIn').click();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const v = $('#awVid'); v.srcObject = stream; await v.play(); $('#awLive').hidden = false;
      } catch { stopLive(); $('#awCamIn').click(); }
    };
    $('#awStop').onclick = stopLive;
    $('#awSnap').onclick = () => {
      const v = $('#awVid'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
      c.toBlob((b) => { if (b) addFiles([new File([b], 'photo-' + Date.now() + '.jpg', { type: 'image/jpeg' })]); stopLive(); }, 'image/jpeg', 0.9);
    };
    $('#awSub').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { subject = b.dataset.s; $('#awSub').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); check(); }));
    if (teacher) $('#awS').onchange = check;
    $('#awNo').oninput = () => { $('#awCnt').textContent = $('#awNo').value.length + ' / 500'; };
    $('#awGo').onclick = async () => {
      busy = true; $('#awGo').disabled = true; const sid = teacher ? $('#awS').value : '', note = $('#awNo').value.trim(), ti = $('#awTi').value.trim();
      let ok = 0, last = '';
      for (let i = 0; i < files.length; i++) {
        $('#awMsg').textContent = `Saving ${i + 1} of ${files.length}…`;
        try {
          const f = await shrink(files[i]);
          const title = (ti ? ti + (files.length > 1 ? ' ' + (i + 1) : '') : '') || (note ? note.split(/[.!?\n]/)[0].slice(0, 60) : '') || (/^image\//.test(f.type) ? 'Photo' : f.name.replace(/\.[^.]+$/, ''));
          const q = new URLSearchParams({ subject, title, note, app: 'photo' }); if (sid) q.set('student', sid);
          const r = await fetch('/api/upload?' + q, { method: 'POST', headers: { Authorization: 'Bearer ' + o.token(), 'Content-Type': f.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(f.name || 'photo.jpg') }, body: f });
          const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Upload failed');
          ok++;
        } catch (x) { last = x.message; }
      }
      busy = false;
      if (ok === files.length) { toast(ok === 1 ? 'Saved to the portfolio ✓' : ok + ' items saved ✓'); close(); o.onDone && o.onDone(ok); }
      else { files = files.slice(ok); drawThumbs(); $('#awMsg').textContent = (last || 'Something went wrong') + ' — nothing lost, try Save again.'; if (ok) o.onDone && o.onDone(ok); check(); }
    };
    drawThumbs();
    return { close };
  }
  CP.addWork = addWork;
})();
