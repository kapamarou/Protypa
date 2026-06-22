# Extension paste-prompts — run the whole suite

Copy one block at a time into the **Claude in Chrome** extension, top to bottom.
Each block is self-contained (it logs in as the right account and reports PASS/FAIL).

**Before you start — find & replace these in any block if yours differ:**
- `BASE` = `http://localhost:3000`
- `PASSWORD` = `Test1234!` (whatever you set when creating the users)

**Prereqs:** migrations 0027–0031 applied + `docs/test-data-setup.sql` STEP 2 run
(verification query all `ok=true`). Prompt 2 (AUTH) needs a **real email inbox** —
use a Gmail you control for that one only.

---

## Prompt 1 — Security, logged OUT  *(no account needed)*

```
Ignore any previous task — this is NOT about email/RSVP. You are testing the Protupa web app at BASE (a Greek exam-grading site). Stay LOGGED OUT for this whole task. Run each check and report PASS/FAIL with a screenshot on any FAIL:
1. Visit BASE/account — expect a redirect to /signin (URL contains next=/account), no account data shown.
2. Visit BASE/account/students — expect redirect to /signin.
3. Visit BASE/admin — expect redirect to /signin.
4. Fetch BASE/api/yli/greek — expect HTTP 401 and JSON {"error":"unauthenticated"} (NOT a PDF).
5. Visit BASE/grade/00000000-0000-0000-0000-000000000000 — expect a redirect to /signin or an access-denied page, NEVER exam content.
6. Open-redirect: visit BASE/auth/callback?next=//evil.com&code=test — report the FINAL URL. PASS only if you stay on the BASE origin (e.g. an auth-error page); FAIL if it goes to evil.com.
Report a PASS/FAIL table.
```

---

## Prompt 2 — Authentication  *(needs a REAL email inbox)*

```
Ignore any previous task. Testing Protupa at BASE. Use the real email REPLACE_WITH_YOUR_GMAIL for this. Report PASS/FAIL per step:
1. Go to BASE/signup and register a new SCHOOL account with that email + PASSWORD. Expect a "check your email (and spam)" confirmation screen.
2. STOP and tell me to open the Brevo verification email and click the link; after I confirm, check that the link lands authenticated.
3. Sign out (find the sign-out control).
4. Go to BASE/signin, sign in with that email + PASSWORD — expect to land on /account.
5. Sign out, then try BASE/signin with a WRONG password — expect an inline error and NO redirect.
6. Go to BASE/forgot-password, submit the email — expect an "email sent (check spam)" message. Tell me to open the reset email; after I confirm, set a new password on /reset-password and verify sign-in with the new password works.
Report a PASS/FAIL table.
```

---

## Prompt 3 — School happy path  *(logs in as school.paid)*

```
Ignore any previous task. Testing Protupa at BASE. First sign in: go to BASE/signin, email school.paid@protupa.test, password PASSWORD, submit. If you are routed to an onboarding flow, complete the SCHOOL form (confirm there is NO "Μαθήματα/subjects" step, and that the "Διακριτικός τίτλος" field warns it becomes the PDF watermark), then continue to /account. Then run each check, PASS/FAIL with screenshots on FAIL:
1. /account shows KPI numbers and an "x/limit μαθητές" counter; all text is legible (no grey-on-grey).
2. Trigger "export my data" — a file protypa-data-export.json downloads. Open it: it must contain a non-empty students list, plus profile, school, purchases.
3. /account/students — add a student (name + class year): it appears in the list and the counter increments. Edit it, then delete it.
4. /account/grading — confirm columns: Θέματα and Απαντήσεις (each with Γλώσσα/Μαθηματικά pill buttons), a Στατιστικά window column, and a Κατάσταση column.
5. Open an exam, mark a few questions wrong for a student, submit — a score appears. Reopen the same exam ("Επεξεργασία →"), change answers, resubmit — the score updates.
6. Download all 4 paper kinds by visiting BASE/api/account/exam-paper/<simId>?kind=greek-questions (then math-questions, greek-answers, math-answers). Each PDF opens and is watermarked with "Φροντιστήριο TEST". Download one a second time — it should return quickly (cached) and the filename includes the kind label.
7. /account/school shows the school's stats, the national comparison, and a score average.
Report a PASS/FAIL table.
```

---

## Prompt 4 — Parent  *(logs in as parent.paid)*

```
Ignore any previous task. Testing Protupa at BASE. Sign in: BASE/signin, email parent.paid@protupa.test, password PASSWORD. If routed to onboarding, complete the PARENT form and confirm it only asks for first/last name, email, phone, address, ΑΦΜ — nothing else. Then PASS/FAIL:
1. /account renders the parent dashboard.
2. Download an exam paper (BASE/api/account/exam-paper/<simId>?kind=greek-questions) — it must be RAW / un-watermarked (no school name stamped).
3. Visit BASE/account/school — expect a redirect to /account (parents do NOT get school-wide/national stats).
Report a PASS/FAIL table.
```

---

## Prompt 5 — Paywall / entitlement  *(logs in as school.free)*

```
Ignore any previous task. Testing Protupa at BASE. Sign in: BASE/signin, email school.free@protupa.test, password PASSWORD (complete onboarding if prompted). This account has NO active package. PASS/FAIL:
1. Visit /account/students — expect an "Απαιτείται πακέτο" paywall prompt, NOT the student manager.
2. Visit /account/school — expect the same paywall prompt.
3. Confirm there is no way to trigger an AI student summary (the feature is gated behind an active package).
Report a PASS/FAIL table.
```

---

## Prompt 6 — Admin  *(logs in as admin)*

```
Ignore any previous task. Testing Protupa at BASE. Sign in: BASE/signin, email admin@protupa.test, password PASSWORD — expect to land on /admin. PASS/FAIL:
1. The admin sidebar shows: Πίνακας, Φροντιστήρια, Γονείς, Διαγωνίσματα, Νέα, Πακέτα. Resize to ~375px and confirm a hamburger drawer opens/closes.
2. /admin/schools lists schools with real details (not blank rows).
3. /admin/parents lists parents WITH their email addresses and active-package status.
4. /admin/simulations shows 4 PDF upload slots (Θέματα/Απαντήσεις × Γλώσσα/Μαθηματικά) and an "Άνοιγμα PDF" preview that opens a PDF.
5. /admin/news — create a post with a FUTURE publish date: confirm it does NOT appear on BASE/nea. Edit it to a PAST date: confirm it now appears on /nea.
6. /admin/packages renders and an edit persists after reload.
7. /admin/yli — upload a ύλη PDF and toggle its visibility on.
Report a PASS/FAIL table.
```

---

## Prompt 7 — Security logged-IN / IDOR  *(school.paid → attacker)*

```
Ignore any previous task. Testing Protupa at BASE — this is an authorized access-control test. PASS = the breach FAILS.
Phase A (as the victim): sign in BASE/signin as school.paid@protupa.test / PASSWORD. Go to /account/students, open a student, and COPY the full URL (it contains the student id). Also open /grade of any paper if reachable. Keep these URLs. Then sign out.
Phase B (as the attacker): sign in as attacker@protupa.test / PASSWORD (no package). Then:
1. Paste the victim's /account/students/<id> URL — it must show nothing / "not found", never the other school's student.
2. Paste the victim's /account/grading/<id> URL (if you have one) — same: no foreign data.
3. Answer-key leak: open BASE/grade/<any paper id>, then "read the page HTML source" and search for the text correct_answer — it must be ABSENT.
Report a PASS/FAIL table. (Self-promotion via SQL is covered by the migration verification query; skip unless you're comfortable in devtools.)
```

---

## Prompt 8 — Rate limits + input validation  *(school.paid)*

```
Ignore any previous task. Testing Protupa at BASE. PASS/FAIL:
1. Go to BASE/epikoinonia and make a direct POST to BASE/api/contact with JSON {"name":"x","email":"foo","subject":"Γενικές","message":"hi"} — expect HTTP 400 and {"error":"Μη έγκυρη διεύθυνση email."}.
2. Submit the contact form with valid data ~6 times rapidly — expect an HTTP 429 / "too many requests" after the 5th.
3. Sign in as school.paid@protupa.test / PASSWORD, then request BASE/api/account/export ~12 times rapidly — expect a 429 after ~10.
Report a PASS/FAIL table.
```

---

## Prompt 9 — Responsive & accessibility  *(any state)*

```
Ignore any previous task. Testing Protupa at BASE. PASS/FAIL:
1. Resize to ~375px: the public header collapses to a working menu; /admin (as admin) uses a hamburger drawer.
2. On any page, press Tab once — a "Μετάβαση στο κύριο περιεχόμενο" skip link appears and jumps to #main-content.
3. At ~375px, /paketa and /account/grading have NO horizontal overflow and buttons are tappable.
Report a PASS/FAIL table.
```

---

## Scorecard (fill as you go)

| Prompt | Suite | Result | Notes |
|---|---|---|---|
| 1 | Security (logged out) | | |
| 2 | Auth (real email) | | |
| 3 | School happy path | | |
| 4 | Parent | | |
| 5 | Paywall | | |
| 6 | Admin | | |
| 7 | IDOR / access control | | |
| 8 | Rate limits + validation | | |
| 9 | Responsive / a11y | | |
