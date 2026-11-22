# Add "Save to portfolio" to a classroom app

**For Claude.** The teacher has pointed you at an app and at this file. Your job is to wire that app into the teacher's **Class Portfolio** so students (or the teacher) can send whatever the app produces — a drawing, screenshot, video, audio recording, piece of writing, or a test score — into the right child's portfolio.

The portfolio lives at **https://YOUR-PORTFOLIO.pages.dev** (Cloudflare Pages + R2 + D1). You do not need to touch it. You only add a small script to the app. The app stays a normal standalone app hosted on GitHub Pages / Netlify.

> If the address above still says `YOUR-PORTFOLIO.pages.dev`, ask the teacher for the real address of their portfolio site (or have them download this file again from the portfolio's **Connect apps** page, which fills it in).

---

## 1. What the teacher gets

- A floating **"Save to portfolio"** button on the app.
- Students sign in **once** with a personal 6-character code (ABC-123). On a shared iPad they are signed out after 20 idle minutes or when they tap "That's me done".
- The teacher can also sign in (password) and send work to one student, several, or everyone.
- Work lands in the child's portfolio under **Maths, Reading, Writing or Topic**. Anything with no subject goes to an Inbox the teacher sorts.
- Parents see it via their private QR code. Nothing you do needs to know about parents.

## 2. The one-line install (do this first, for every app)

Put this just before `</body>` of the app's main HTML file:

```html
<script src="https://YOUR-PORTFOLIO.pages.dev/sdk.js"
        data-subject="Maths" data-app="Whiteboard" defer></script>
```

| Attribute | Meaning |
|---|---|
| `data-subject` | **Maths**, **Reading**, **Writing** or **Topic**. Pre-selects the subject chip (students can change it). Leave off for apps used across subjects. |
| `data-app` | Friendly app name shown on each saved item. Defaults to the page title. |
| `data-button="off"` | Hide the floating button — use when the app has its own "Save" button that calls `ClassPortfolio.open()`. |
| `data-label` | Button text. Default "Save to portfolio". |
| `data-position` | `bottom-right` (default), `bottom-left`, `top-right`, `top-left`. |
| `data-idle-minutes` | Student auto sign-out. Default 20. |
| `data-transparent="true"` | Keep canvas transparency (default flattens canvases onto white). |

With just that line the button already offers: a screenshot of the screen, any visible large `<canvas>` as "My drawing", and "Choose a photo, video or file…". For many apps that is enough. **Then look for better, app-specific outputs (section 4).**

> Use the same line in every app. It is safe to add to apps that are loaded inside the Class HQ hub iframes. Students stay signed in across all the teacher's apps hosted on the same GitHub Pages account because the sign-in is stored once for that origin.

## 3. Decide what the app should offer

Read the app's code first. Work out:

1. **What does the child *make* or *achieve* here?** (a drawing, an animation/video, a recorded voice, typed writing, a quiz score, a finished worksheet, a spelling result…)
2. **Which subject does it belong to?** Maths / Reading / Writing / Topic. If the app is one subject, set `data-subject`. If it covers several, pass `subject` per output.
3. **Where does that thing live in the code?** (`<canvas>`, a `Blob` from `MediaRecorder`, a `<textarea>`, a `score` variable, a results screen…)

Then use the recipes below. Prefer **one or two clear outputs** over lots of options — children are 9–11 years old.

## 4. Recipes

All of these are plain JavaScript; the script exposes `window.ClassPortfolio`.

### a) Register an output (shows as a choice in the Save panel)
```js
ClassPortfolio.register({
  label: 'My animation',                 // what the child sees
  description: 'The video I just made',  // optional small text
  get: async () => ({ blob: myVideoBlob, title: 'My stop-motion', subject: 'Topic' })
});
```
`get()` may return any of: a `Blob`/`File`, a `<canvas>`, a `data:` URL string, plain text, or an object `{ blob | canvas | dataUrl | text | json, title, subject, filename, note }`. It can be async (e.g. wait for a render). Register after the output exists, or have `get()` build it on demand (preferred).

### b) Drawing / whiteboard apps
Usually nothing to do — the largest `<canvas>` is offered automatically. If the app draws on several layered canvases or a canvas that is hidden/off-screen, register it explicitly:
```js
ClassPortfolio.register({ label: 'My whiteboard', get: () => document.getElementById('board') });
```
Canvases are flattened onto white, and large images are shrunk to ≤2000px JPEG/PNG automatically.

### c) Video / animation / stop-motion (MediaRecorder)
```js
// after recorder.onstop has produced `chunks`
const blob = new Blob(chunks, { type: recorder.mimeType || 'video/mp4' });
ClassPortfolio.register({ label: 'My movie', get: () => ({ blob, title: 'Stop motion movie', subject: 'Topic' }) });
```
Limit: **60 MB** per file. If the app can export lower bitrate / shorter clips, do that. iPad Safari records `video/mp4`; Chrome records `video/webm` — both are accepted.

### d) Audio recordings (reading aloud, speeches)
Same as video with an audio `Blob` (`audio/webm`, `audio/mp4`, `audio/mpeg`). Use `subject: 'Reading'` or `'Writing'`.

### e) Typed writing
```js
ClassPortfolio.register({ label: 'My writing', get: () => ({ text: document.querySelector('#story').value, title: 'My story', subject: 'Writing' }) });
```

### f) Quiz / test / game results
Call this when the child finishes. It asks nicely and does nothing if they decline:
```js
ClassPortfolio.offer({
  title: 'Times tables test', subject: 'Maths',
  score: 18, total: 20,
  details: [ { q: '7 × 8', answer: '56', correct: true }, { q: '9 × 6', answer: '52', correct: false } ] // optional
}, 'Save your score to your portfolio?');
```
`ClassPortfolio.sendResult({...})` (same object) saves immediately and asks the child to sign in if needed. Use `offer` for children, `sendResult` only if the teacher asks for automatic saving. The teacher sees a score badge ("18/20") on the card and the question list when opened.

### g) A worksheet/printable (PDF) or image the app already exports
Hook the app's existing "download" code: where it creates a `Blob`/`File`, register it as in (a). `application/pdf`, images, audio, video, `.txt`, `.json`, Word/Excel/PowerPoint files are accepted. **HTML files are not accepted** (turn them into a screenshot or PDF).

### h) A custom "Save" button inside the app
```html
<button onclick="ClassPortfolio.open()">📁 Save to my portfolio</button>
```
and add `data-button="off"` to the script tag if the floating button isn't wanted. `ClassPortfolio.open({subject:'Writing'})` pre-selects a subject.

### i) Reacting after a save (optional)
```js
window.addEventListener('portfolio:sent', e => console.log('saved', e.detail)); // e.detail = {id, title, subject, ...}
```

## 5. API reference (`window.ClassPortfolio`)

| Call | What it does |
|---|---|
| `open({subject?})` | Open the Save panel (asks to sign in first). |
| `register({id?, label, description?, get})` | Add an output choice. Re-registering the same `id`/`label` replaces it. |
| `send(payload)` | Student: saves straight away (if a subject is known) and shows a toast. Teacher: opens the panel pre-filled so they can choose students. Returns a Promise of the saved item. |
| `sendResult({title,score,total,subject,details?,note?})` | Save a result. |
| `offer(payloadOrResult, message?)` | Banner "Save this to your portfolio?" with Save / No thanks. |
| `screenshot()` | Promise<Blob> of the visible screen (loads html2canvas on demand). |
| `showButton()` / `hideButton()` | Show or hide the floating button (e.g. hide while recording). |
| `user()` | `{role:'student'\|'teacher', name}` or `null`. |
| `signOut()` | Clear this device's session. |

`payload` follows the same rules as `get()` above.

## 6. Rules for the edit

- **Add, don't restructure.** Do not rewrite the app. One `<script>` line plus, at most, a few `register`/`offer` calls.
- **Never put student names, codes, passwords or tokens in the app's code.** The widget handles all sign-in.
- **Do not change the app's own look**, except to position the floating button if it covers an important control (`data-position`).
- **Keep it working offline-tolerant**: if the portfolio can't be reached the app must still work normally. The widget already fails quietly; don't wrap app logic in it.
- **Keep every existing feature working.** If the app has a back-to-hub link, print styles or a fullscreen mode, leave them alone. Hide the floating button in print/recording modes with `ClassPortfolio.hideButton()` if needed.
- Follow the teacher's other conventions (e.g. for Bible/Christian content, wording stays as the app already has it).
- If the app is a hub that loads other apps, add the script to each app, not the hub.

## 7. Test before you say it's done

Run the app locally or via its hosted URL, then check:

1. The "Save to portfolio" button appears and doesn't cover important controls (try an iPad-sized window ~ 1024×768 and a narrow one).
2. Open it. With **a student code** (ask the teacher for a test student; do not invent one) the panel shows their name, the right output choices, and the subject chips (pre-selected if `data-subject` is set).
3. Save something. You see **Saved!**, and the teacher sees it under the right subject on the portfolio site.
4. Cancel and "Not you?" both work; the app still works normally after closing the panel.
5. No errors in the browser console from the app or `sdk.js`.
6. If you added a `register`/`offer`, trigger it and confirm the saved item opens correctly (image shows, video plays, score shows).

If you cannot sign in to test (no test code available), say so plainly and describe exactly what you changed and what the teacher should try.

## 8. Publishing

The teacher hosts apps through GitHub (web UI on a Mac; sites on Netlify/GitHub Pages). After editing, tell them which file(s) changed so they can upload/commit them. Their site's address is not changing, only the app files.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| Button doesn't appear | Check the `<script src>` address is exactly the portfolio's address and ends in `/sdk.js`; check the browser console. If the app sets a very high `z-index`, that's fine — the widget uses the maximum. |
| "Can't reach the portfolio" | Internet/school filter blocking `*.pages.dev`, or the address is wrong. |
| "That code isn't right" | Code typed wrong, or the teacher reset it. Codes are 6 characters, no I/L/O/0/1. |
| Screenshot is blank/missing images | Cross-origin images taint screenshots. Prefer registering the canvas or blob directly. |
| "That file type is not supported" | Only images, video, audio, PDF, text/JSON/CSV, Word/Excel/PowerPoint. Convert HTML to PDF/screenshot. |
| "Too big (max 60 MB)" | Lower the video bitrate or shorten the recording. |
| Student is already "signed in" as someone else | Tap **Not you?** in the panel. Sessions expire after 20 idle minutes. |
