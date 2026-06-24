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

## Prompt 10 — Student limits & paywall *(school.free, school.paid, parent.paid)*

```
Ignore any previous task. Testing Protupa at BASE — student limit and paywall enforcement. Run each sub-check, PASS/FAIL with screenshots on any FAIL.

─── Phase A: No-package paywall (as school.free) ───
Sign in: BASE/signin, email school.free@protupa.test, password PASSWORD (complete onboarding if prompted).
A1. Visit BASE/account/students — expect a paywall/upgrade prompt (text like "Απαιτείται πακέτο" or "για τη διαχείριση μαθητών"), NOT the student list. PASS if paywall shows; FAIL if the student manager appears.
Sign out.

─── Phase B: School limit (as school.paid, 10-student package) ───
Sign in: BASE/signin, email school.paid@protupa.test, password PASSWORD.
B1. Visit BASE/account/students and confirm a "X/10 μαθητές" counter appears below the "Νέος μαθητής" button.
B2. Seed students to exactly 10 via javascript_tool (copy-paste this into the tool, replacing SCHOOL_USER_ID with the logged-in user id from localStorage key "sb-*-auth-token" → user.id):
    const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
    const sess = JSON.parse(localStorage.getItem(lsKey)||'{}');
    const uid = sess?.user?.id;
    const scripts = Array.from(document.querySelectorAll('script')).map(s=>s.textContent||'').join('');
    const supaUrl = (scripts.match(/https:\/\/[a-z0-9]+\.supabase\.co/)||[])[0];
    const anonKey = (scripts.match(/eyJ[A-Za-z0-9._-]{100,}/)||[])[0];
    const token = sess?.access_token;
    // Count existing students first
    const existing = await fetch(`${supaUrl}/rest/v1/students?school_id=eq.${uid}&select=id`,{headers:{'Authorization':`Bearer ${token}`,'apikey':anonKey}});
    const count = (await existing.json()).length;
    const toAdd = 10 - count;
    const results = [];
    for(let i=0;i<toAdd;i++){
      const r=await fetch(`${supaUrl}/rest/v1/students`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'apikey':anonKey,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({school_id:uid,first_name:`Seed`,last_name:`${i+1}`,class_year:null,subjects:[]})});
      results.push(r.status);
    }
    return {uid,supaUrl:supaUrl?.slice(0,30),toAdd,statuses:results};
    Reload the page and confirm the counter shows 10/10 μαθητές.
B3. Click "+ Νέος μαθητής", fill in first name "Τεστ" and last name "ΌριοΥπέρβαση", and submit. Expect the limit modal to appear containing:
    • A heading with "Φτάσατε το όριο των 10 μαθητών"
    • A button/link "Αναβάθμιση πακέτου →"
    • A button "+ Επέκταση 5 μαθητών"
    PASS only if all three elements are present; FAIL if student is saved or any element is missing.
B4. Close the modal. Security bypass test — still at 10/10, use javascript_tool to call the Supabase REST API directly without going through the UI, inserting an 11th student:
    const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
    const sess = JSON.parse(localStorage.getItem(lsKey)||'{}');
    const uid = sess?.user?.id;
    const token = sess?.access_token;
    const scripts = Array.from(document.querySelectorAll('script')).map(s=>s.textContent||'').join('');
    const supaUrl = (scripts.match(/https:\/\/[a-z0-9]+\.supabase\.co/)||[])[0];
    const anonKey = (scripts.match(/eyJ[A-Za-z0-9._-]{100,}/)||[])[0];
    const res = await fetch(`${supaUrl}/rest/v1/students`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'apikey':anonKey,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({school_id:uid,first_name:'Security',last_name:'Bypass',class_year:null,subjects:[]})});
    return {status:res.status,body:await res.text()};
    EXPECTED RESULT: HTTP 201 = FAIL (known security gap — no server-side limit; the UI-only check was bypassed). HTTP 400/403 = PASS (server correctly blocks it). Report which you got.
Sign out.

─── Phase C: Parent limit (as natasaathens2002.com@gmail.com, 1-student package) ───
Sign in: BASE/signin, email natasaathens2002.com@gmail.com, password PASSWORD.
C1. Visit BASE/account/students — confirm a "X/1 μαθητές" counter is visible.
C2. If counter shows 0/1, click "+ Νέος μαθητής", enter first name "Τεστ" last name "Παιδί", submit. Confirm student saved and counter becomes 1/1.
C3. Click "+ Νέος μαθητής" again, fill in a different name, and submit. Expect the limit modal containing:
    • A heading "Φτάσατε το όριο των 1 μαθητή"
    • Text "Το πακέτο γονέα επιτρέπει έως 1 παιδί. Για περισσότερα παιδιά επικοινωνήστε μαζί μας."
    • NO "Αναβάθμιση πακέτου" link/button
    • NO "+ Επέκταση 5 μαθητών" button
    PASS only if modal shows with the "contact us" text AND without upgrade/expansion options.
Sign out.

Report a PASS/FAIL table. B4 is expected to FAIL (documented security gap).
```

---

## Prompt 12 — Stripe payment flow  *(cheddarthecorgi99@gmail.com — no package)*

**Before you start:**
- Open a terminal and run: `stripe listen --forward-to localhost:3000/api/webhook`
  It will print a `whsec_...` secret — make sure it is set as `STRIPE_WEBHOOK_SECRET` in `.env.local` and the dev server is restarted.
- `STRIPE_SECRET_KEY` must be a test key (`sk_test_...`).
- Every package in the DB must have a `stripe_price_id` pointing to a test-mode Stripe price.
- Test card: **4242 4242 4242 4242** · expiry **12/29** · CVC **123** · postcode **10001**.

```
Ignore any previous task. Testing Protupa payments at BASE. Run each check, PASS/FAIL with screenshots on any FAIL.

─── Phase A: Packages page (logged OUT) ───
A1. Visit BASE/paketa — confirm at least one package is displayed with a price and a buy button.
A2. Click a buy button while logged out — expect a redirect to /signin (you should NOT be taken to Stripe). PASS if you land on /signin; FAIL if Stripe checkout opens.

─── Phase B: Happy-path purchase (as cheddarthecorgi99@gmail.com) ───
Sign in: BASE/signin, email cheddarthecorgi99@gmail.com, password PASSWORD.
B1. Visit BASE/account/students — expect the paywall ("Απαιτείται πακέτο"), NOT the student list.
B2. Visit BASE/paketa and click the buy button for the school package (e.g. "school-tier-1"). Expect to be redirected to a stripe.com checkout URL. PASS if the URL starts with https://checkout.stripe.com; FAIL if you get an error or stay on the site.
B3. On the Stripe checkout page, fill in the test card: number 4242 4242 4242 4242, expiry 12/29, CVC 123, postcode 10001, any name. Submit the payment. Expect a redirect back to BASE/account?purchase=success. PASS if you land there; FAIL if Stripe shows an error or redirect goes elsewhere.
B4. After landing on /account?purchase=success, wait 5 seconds, then visit BASE/account/students — expect the student manager to appear (NO paywall). PASS if the list loads; FAIL if the paywall is still shown (means the webhook did not deliver).
B5. Verify the success_url and cancel_url use the BASE origin (not a third-party domain): on the Stripe checkout page (step B3), before submitting, check the URL bar — it must be checkout.stripe.com and the page text must show "protupa.gr" as the merchant. PASS if protupa.gr is shown; FAIL if another domain appears.

─── Phase C: API security (still signed in as cheddarthecorgi99@gmail.com) ───
C1. POST to BASE/api/checkout with body {"package_id":"00000000-0000-0000-0000-000000000000"} — expect HTTP 404 {"error":"package not found"}.
C2. Sign out, then POST to BASE/api/checkout with any body — expect HTTP 401 {"error":"unauthenticated"}.

─── Phase D: Refund → access revoked ───
D1. Go to the Stripe Dashboard (dashboard.stripe.com) → Payments → find the test payment just made → click "Refund" → refund the full amount → confirm. Tell me when done.
D2. Wait 10 seconds (for webhook delivery), then reload BASE/account/students as cheddarthecorgi99@gmail.com — expect the paywall to reappear. PASS if paywall shows; FAIL if the student list is still accessible.

Report a PASS/FAIL table. B4 FAIL means the webhook is not forwarding — check that `stripe listen` is running and STRIPE_WEBHOOK_SECRET matches its output.
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
| 10 | Student limits & paywall | PASS | B4 N/A — anon key not in client bundles; REST call returns 401 without it |
| 12 | Stripe payment flow | | D2 FAIL = webhook not forwarding |
