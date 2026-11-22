# Class Portfolio

A private learning portfolio for one class. Students save work from your apps; you see each child's portfolio by subject (Maths, Reading, Writing, Topic); families scan a personal QR code to see only their own child.

- **Code lives in GitHub.** The website and its small server code are in this folder.
- **Runs on Cloudflare.** Pages (the site), R2 (the files), D1 (the student list and file index). No servers to look after.
- **Costs:** should fit inside Cloudflare's free allowances for one class. Cloudflare may ask for a payment method to switch R2 on; check their current pricing page.

```
portfolio/
  public/                  <- the website (Cloudflare Pages serves this)
    index.html             sign-in page (student code / teacher password)
    teacher.html           teacher hub: class, student portfolios, roster, print QR cards
    me.html                a student's own portfolio
    family.html            what a parent sees after scanning their QR code
    sdk.js                 THE WIDGET: one line in any app adds "Save to portfolio"
    sdk-demo.html          a test page to try the widget
    ADD-PORTFOLIO-TO-AN-APP.md   instructions you give to Claude for each app
    assets/config.js       class name, school name, year  <- edit this
  functions/api/[[path]].js    the server (logins, uploads, file storage)
  schema.sql               reference only (the server creates tables itself)
  wrangler.example.toml    only needed if you ever use the command line
```

## One-time setup (about 20 minutes)

You'll need a free Cloudflare account and your GitHub.

**1. Put the folder in GitHub**
Create a new **private** repository (e.g. `class-portfolio`) and upload everything in this folder (the GitHub website's *Add file → Upload files* works; drag the `public` and `functions` folders and the other files in). If you put it inside a bigger repo (e.g. your Class_Tracking repo) in a `portfolio/` subfolder, remember that name for step 4.

**2. Make the storage** (Cloudflare dashboard)
- *R2 object storage → Create bucket* → name it `class-portfolio-files` (leave it private).
- *D1 SQL database → Create* → name it `class-portfolio`. (Leave it empty; the app builds its tables on first use.)

**3. Pick two secrets**
- A **teacher password** you'll remember.
- A long random **session secret** (mash the keyboard for 40+ characters; you never type it again).

**4. Create the site**
*Workers & Pages → Create → Pages → Connect to Git* → choose the repo.
- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: **`public`**
- Root directory: leave empty (or `portfolio` if it's in a subfolder)

Save and deploy. You'll get an address like `https://class-portfolio.pages.dev`.

**5. Connect the storage to the site** (this is the step people miss)
Open the new Pages project → **Settings**:
- **Bindings → Add → D1 database**: variable name `DB` → pick `class-portfolio`.
- **Bindings → Add → R2 bucket**: variable name `FILES` → pick `class-portfolio-files`.
- **Variables and Secrets → Add** (type *Secret*): `TEACHER_PASSWORD` and `SESSION_SECRET`.

Do this for the **Production** environment, then **redeploy** (Deployments → the latest → *Retry deployment*, or push any small change to GitHub).

**6. Check it works**
Open your address → *Teacher* → sign in. If you see "Server not set up yet: missing …", that binding or secret from step 5 isn't saved yet.

**7. Set up your class**
- Edit `public/assets/config.js` on GitHub (pencil icon) to set your class and school name. The site rebuilds in a minute.
- Teacher hub → **Roster** → paste your students' names (one per line).
- **Print** → *Family QR cards* (send home) and *Student login cards* (for students).
- **Connect apps** → follow the steps to add "Save to portfolio" to each app.

## Day to day

- Students open any connected app → tap **Save to portfolio** → type their 6-character code once → choose what to save → **Save**.
- You open the teacher hub, tap a student, pick a subject tab, tap work to comment on it, move it to another subject, hide it from the family, or delete it. The **Inbox** tab holds anything that arrived without a subject.
- **Add work** on a student's page lets you upload a photo or video yourself.

## Privacy and safety

- **Family QR codes** contain a long random key. Anyone holding the card/link can see that one child's shared work, so treat it like a report. If a card is lost: Roster → **New family QR** — the old one stops working immediately.
- **Hide from family:** untick *Visible to family* on any item.
- **Student codes** only let a child save and view their own work. Too many wrong guesses temporarily blocks sign-in attempts.
- The teacher password is checked on the server and signs you in for 12 hours.
- Individual file links are long random addresses (not a list anyone can browse). They're intended for your own use inside the site; deleting a file removes it for good.
- The pages ask search engines not to index them.
- Student names and work are personal information. Check your school's policy and get appropriate family consent for online storage before you start, and delete a student (Roster) when they leave.
- Allowed uploads: pictures, video, audio, PDF, text, Word/Excel/PowerPoint. Up to 60 MB each. HTML is deliberately not accepted.

## Changing things later

| I want to… | Do this |
|---|---|
| Change the class/school name | Edit `public/assets/config.js` |
| Change the teacher password | Cloudflare → Pages project → Settings → Variables and Secrets → edit `TEACHER_PASSWORD` → redeploy |
| Add a student mid-year | Roster → paste the name → print their cards |
| Move to a new class next year | Make a new Pages project + D1 + R2 from the same repo (clean slate), or delete students in Roster |
| Move to your own domain | Pages project → Custom domains. Then reprint QR cards so they use the new address |

## Try it locally (optional, needs Node)
```
npm i -g wrangler
wrangler pages dev public --d1 DB=test --r2 FILES -b TEACHER_PASSWORD=pw -b SESSION_SECRET=anylongstring
```
Then open http://localhost:8788 and the test page at `/sdk-demo`.

---

## End of year: closing the class, downloads, and progress

**Close class** (teacher hub → *Close class*)
1. Download each child's backup zip (or "Download all").
2. Press *Close class* and pick a date families can keep viewing until. Students can no longer sign in or save work; families keep a read-only view.
3. When you're ready for next year, *Start a new class* (type DELETE) wipes all students, files, summaries and ticks and reopens the portfolio empty. It only works once the class is closed.
Existing folders in `Class_Tracking` are not imported.

**Families** can download any single piece of work, or the whole portfolio in one click (a zip with every shared file plus a printable summary page).

**Progress & summary** (per student, and a class overview under *Progress*)
- Curriculum checklist per subject for the student's year level (edit `public/assets/curriculum.js`; Topic statements are starters), your own attainment judgement, quiz/test chart and work-per-month chart.
- *Analyse with Claude*: pick term, **Prepare**, copy the anonymised prompt (the name becomes [Name]), download the images zip, attach them in Claude, paste Claude's reply back, preview, save. Claude's reply includes marking comments, strengths, areas to improve, next steps and home activity ideas, plus suggested checklist updates.
- Summaries are **private until you tick "Share with family"**. Private teacher notes and checklist suggestions are never shown to families. Checklist progress bars on the family page are off by default (Close class page → "What families see").
- Edit `reportContext` in `public/assets/config.js` to describe your school/curriculum for Claude.
- The old tracker's habits, e-asTTle and test-entry features were not carried over.
