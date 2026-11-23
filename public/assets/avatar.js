/* Profile pictures. CP.avatarSpan(student, cls, extraStyle) -> HTML for a round avatar (photo if there is one, otherwise initials)
   CP.profilePhoto({ token, who:'student'|'teacher', student, onDone(student) }) -> take / choose / remove, plus the teacher's lock */
(function () {
  const { esc, toast } = CP;
  CP.avatarSpan = (s, cls, extra) => {
    const img = s.avatar ? `background:#e8e0cc url('${esc(s.avatar)}') center/cover no-repeat;color:transparent;` : '';
    return `<span class="${cls || 'avatar'}" style="--c:${CP.avColor(s.id)};${img}${extra || ''}">${s.avatar ? '' : esc(CP.initials(s.name))}</span>`;
  };
  // centre-crop to a small square: plenty for a face, only ~30-60 KB
  async function square(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const n = Math.min(bmp.width, bmp.height), c = document.createElement('canvas'); c.width = c.height = 400;
    c.getContext('2d').drawImage(bmp, (bmp.width - n) / 2, (bmp.height - n) / 2, n, n, 0, 0, 400, 400);
    return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  }
  const touch = () => matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

  CP.profilePhoto = function (o) {
    const teacher = o.who === 'teacher', s = Object.assign({}, o.student), first = CP.firstName(s.name);
    let blob = null, stream = null, busy = false, previewUrl = '';
    const m = document.createElement('div');
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.style.zIndex = 70;
    const lockedOut = !teacher && s.avatarLocked;
    m.innerHTML = `<div class="card" style="width:min(440px,96vw);max-height:94vh;overflow:auto;background:var(--cream,#fff);color:#1b1b1b;text-align:center">
      <div class="row"><h3 class="grow" style="margin:0;text-align:left">${teacher ? esc(first) + '’s' : 'My'} profile picture</h3><button class="btn sm" id="pfX">Close</button></div>
      <div id="pfPrev" style="width:170px;height:170px;margin:16px auto;border-radius:50%;border:4px solid var(--char,#1b1b1b);overflow:hidden;display:grid;place-items:center;font-weight:900;font-size:3.4rem;background:#e8e0cc"></div>
      ${lockedOut ? `<p style="font-weight:700">Your teacher has turned off profile pictures for now.</p>` : `
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn pri" id="pfCam" type="button" style="flex:1 1 150px;min-height:50px">📷 Take a photo</button><button class="btn" id="pfPick" type="button" style="flex:1 1 150px;min-height:50px">🖼️ Choose a photo</button></div>
      <input type="file" id="pfCamIn" accept="image/*" capture="user" hidden><input type="file" id="pfFileIn" accept="image/*" hidden>
      <div id="pfLive" hidden style="margin-top:10px"><video id="pfVid" playsinline muted style="width:100%;border-radius:14px;background:#000;max-height:46vh"></video><div class="row" style="gap:8px;margin-top:8px"><button class="btn pri grow" id="pfSnap" type="button">Snap!</button><button class="btn" id="pfStop" type="button">Cancel</button></div></div>
      <div class="row gap" style="justify-content:center"><button class="btn pri" id="pfSave" type="button" disabled>Save picture</button>${s.avatar ? '<button class="btn" id="pfDel" type="button">Remove picture</button>' : ''}</div>
      <p class="small mute" id="pfMsg" style="margin:8px 0 0">Use a clear picture of your face. It is cropped to a circle.</p>`}
      ${teacher ? `<label style="display:flex;gap:10px;align-items:center;justify-content:center;margin-top:14px;font-weight:700;cursor:pointer"><input type="checkbox" id="pfLock" ${s.avatarLocked ? 'checked' : ''}> 🔒 Don’t let ${esc(first)} change their own picture</label>` : ''}
    </div>`;
    document.body.appendChild(m);
    const $ = (q) => m.querySelector(q);
    const prev = () => {
      const box = $('#pfPrev'), src = previewUrl || s.avatar;
      box.style.backgroundImage = src ? `url('${src}')` : ''; box.style.backgroundSize = 'cover'; box.style.backgroundPosition = 'center';
      box.textContent = src ? '' : CP.initials(s.name);
    };
    prev();
    function stopLive() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } const l = $('#pfLive'); if (l) l.hidden = true; }
    const close = () => { stopLive(); if (previewUrl) URL.revokeObjectURL(previewUrl); m.remove(); };
    $('#pfX').onclick = close;
    m.addEventListener('mousedown', (e) => { if (e.target === m && !busy) close(); });
    const take = async (f) => { try { blob = await square(f); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(blob); prev(); $('#pfSave').disabled = false; $('#pfMsg').textContent = 'Happy with it? Press Save picture.'; } catch { toast('Sorry, that picture could not be opened. Try another.'); } };
    if (!lockedOut) {
      $('#pfPick').onclick = () => $('#pfFileIn').click();
      $('#pfFileIn').onchange = (e) => { if (e.target.files[0]) take(e.target.files[0]); e.target.value = ''; };
      $('#pfCamIn').onchange = (e) => { if (e.target.files[0]) take(e.target.files[0]); e.target.value = ''; };
      $('#pfCam').onclick = async () => {
        if (touch() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return $('#pfCamIn').click();
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); const v = $('#pfVid'); v.srcObject = stream; await v.play(); $('#pfLive').hidden = false; }
        catch { stopLive(); $('#pfCamIn').click(); }
      };
      $('#pfStop').onclick = stopLive;
      $('#pfSnap').onclick = () => { const v = $('#pfVid'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); c.toBlob((b) => { stopLive(); if (b) take(new File([b], 'me.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.92); };
      const url = '/api/avatar' + (teacher ? '?student=' + encodeURIComponent(s.id) : '');
      const send = async (method, body) => {
        busy = true; $('#pfSave').disabled = true;
        try {
          const r = await fetch(url, { method, headers: Object.assign({ Authorization: 'Bearer ' + o.token() }, body ? { 'Content-Type': 'image/jpeg' } : {}), body });
          const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not save');
          toast(method === 'DELETE' ? 'Picture removed' : 'Picture saved ✓'); close(); o.onDone && o.onDone(d.student);
        } catch (x) { busy = false; toast(x.message, 4000); $('#pfSave').disabled = !blob; }
      };
      $('#pfSave').onclick = () => blob && send('PUT', blob);
      const del = $('#pfDel'); if (del) del.onclick = () => { if (confirm(teacher ? `Remove ${first}'s picture?` : 'Remove your picture?')) send('DELETE'); };
    }
    if (teacher) $('#pfLock').onchange = async (e) => {
      try { await CP.api('students/' + s.id, { token: o.token(), method: 'PATCH', body: { avatarLocked: e.target.checked } }); s.avatarLocked = e.target.checked; toast(e.target.checked ? first + ' can no longer change their picture' : first + ' can change their picture again'); o.onDone && o.onDone(Object.assign({}, s, { avatarLocked: e.target.checked })); }
      catch (x) { e.target.checked = !e.target.checked; toast(x.message); }
    };
  };
})();
