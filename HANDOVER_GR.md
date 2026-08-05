# Protupa — Πλήρες Έγγραφο Παράδοσης Έργου

> Τελευταία ενημέρωση: Αύγουστος 2026  
> Προετοιμάστηκε για παράδοση σε νέο προγραμματιστή

---

## 1. Επισκόπηση Έργου

Το **Protupa** είναι μια πλατφόρμα SaaS για φροντιστήρια και γονείς που προετοιμάζουν μαθητές για τις εξετάσεις εισαγωγής στα Πρότυπα/Ωνάσεια Σχολεία. Η πλατφόρμα παρέχει:

- Ψηφιακή βαθμολόγηση διαγωνισμάτων με παρακολούθηση επίδοσης ανά μαθητή
- Στατιστικά και αναλυτικά στοιχεία (ανά μαθητή, φροντιστήριο και πανελλαδικά)
- Αναφορές προόδου για γονείς παραγόμενες από τεχνητή νοημοσύνη
- Λήψη διαγωνισμάτων με υδατοσήμανση (watermark) ανά φροντιστήριο
- Λήψη PDFs ετήσιας ύλης
- Ενότητα νέων & ανακοινώσεων
- Πρόσβαση βάσει συνδρομής μέσω Stripe
- Πλήρες διαχειριστικό panel (admin)

Το προϊόν είναι πλήρως μεταφρασμένο στα ελληνικά.

---

## 2. Τεχνολογικό Στοίβα (Tech Stack)

### Γλώσσες
| Γλώσσα | Πού χρησιμοποιείται |
|---|---|
| **TypeScript** | Παντού — frontend, backend, API routes |
| **SQL** | Supabase migrations, RLS πολιτικές, RPCs |
| **CSS** | Tailwind v4 utility classes μέσα σε JSX |

### Framework & Runtime
| Εργαλείο | Έκδοση | Σκοπός |
|---|---|---|
| **Next.js** | 16.2.2 | Full-stack React framework (App Router) |
| **React** | 19.2.4 | Rendering UI |
| **Node.js** | 20+ | Runtime για API routes |

### Στυλιστικά
| Εργαλείο | Έκδοση | Σημειώσεις |
|---|---|---|
| **Tailwind CSS** | v4 | Μέσω `@tailwindcss/postcss` — δεν υπάρχει `tailwind.config.ts` |
| **PostCSS** | — | `postcss.config.mjs` |
| **Custom fonts** | — | Noto Sans (ελληνικό subset) μέσω Google Fonts variable |

### Backend / Βάση Δεδομένων
| Εργαλείο | Έκδοση | Σκοπός |
|---|---|---|
| **Supabase** | `@supabase/supabase-js` 2.102.1 | PostgreSQL DB + Auth + Storage + RLS |
| **@supabase/ssr** | 0.10.0 | Cookie-based SSR auth για Next.js |

### Πληρωμές
| Εργαλείο | Έκδοση | Σκοπός |
|---|---|---|
| **Stripe** | 22.0.0 | Εφάπαξ checkout sessions + webhook για ενεργοποίηση πρόσβασης |

### Τεχνητή Νοημοσύνη
| Εργαλείο | Έκδοση | Σκοπός |
|---|---|---|
| **OpenAI** | 6.44.0 | GPT-4o-mini για αναφορές προόδου μαθητών |

### Email
| Εργαλείο | Σκοπός |
|---|---|
| **Brevo** (πρώην Sendinblue) | Transactional emails μέσω REST API |

### PDF
| Εργαλείο | Σκοπός |
|---|---|
| **pdf-lib** 1.17.1 | Υδατοσήμανση PDF (όνομα φροντιστηρίου στα διαγωνίσματα) |
| **@pdf-lib/fontkit** 1.1.1 | Υποστήριξη γραμματοσειρών στο PDF |

### Επεξεργασία Αρχείων
| Εργαλείο | Σκοπός |
|---|---|
| **xlsx** 0.18.5 | Ανάγνωση Excel αρχείων που ανεβάζει ο admin (κατηγορίες ερωτήσεων) |

### Validation
| Εργαλείο | Σκοπός |
|---|---|
| **Zod** 4.4.3 | Επικύρωση δεδομένων σε API inputs |

### Παρακολούθηση Σφαλμάτων
| Εργαλείο | Σκοπός |
|---|---|
| **Sentry** (`@sentry/nextjs` 10.59.0) | Καταγραφή σφαλμάτων σε production (προαιρετικό — η εφαρμογή λειτουργεί και χωρίς) |

### Testing
| Εργαλείο | Σκοπός |
|---|---|
| **Jest** 29 + **ts-jest** | Unit tests για scoring, grading, entitlements, formatters |

---

## 3. Εξωτερικές Υπηρεσίες & Λογαριασμοί

Οι παρακάτω εξωτερικοί λογαριασμοί απαιτούνται για τη λειτουργία του έργου. Ο αποχωρών προγραμματιστής πρέπει να μεταφέρει τα credentials ή να σας προσθέσει σε κάθε υπηρεσία.

### 3.1 Supabase
- **Τι κάνει:** Φιλοξενεί τη βάση δεδομένων PostgreSQL, τον έλεγχο ταυτότητας χρηστών και την αποθήκευση αρχείων
- **Κονσόλα:** https://supabase.com → project dashboard
- **Κλειδιά που χρειάζονται:**
  - `NEXT_PUBLIC_SUPABASE_URL` — URL του project
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — δημόσιο κλειδί (ασφαλές να εκτεθεί)
  - `SUPABASE_SERVICE_ROLE_KEY` — μυστικό κλειδί admin (ΠΟΤΕ σε client-side κώδικα)
- **Storage buckets:**
  - `exam-papers` — ιδιωτικό· αποθηκεύει PDFs ύλης (`yli/greek.pdf`, `yli/math.pdf`, `yli/apodesmeusi.pdf`) και διαγωνίσματα
  - `news-images` — δημόσιο· αποθηκεύει εικόνες εξωφύλλου άρθρων
- **Για εφαρμογή migrations:** Χρησιμοποιήστε τον SQL Editor του Supabase και εκτελέστε κάθε αρχείο από `supabase/migrations/` με τη σειρά

### 3.2 Stripe
- **Τι κάνει:** Διαχειρίζεται τις πληρωμές και ενεργοποιεί πρόσβαση μέσω webhook
- **Κονσόλα:** https://dashboard.stripe.com
- **Κλειδιά που χρειάζονται:**
  - `STRIPE_SECRET_KEY` — `sk_live_...` (ή `sk_test_...` για δοκιμαστική λειτουργία)
  - `STRIPE_WEBHOOK_SECRET` — `whsec_...` από Developers → Webhooks
- **Webhook endpoint:** `https://protupa.gr/api/webhook`
- **Webhook event:** `checkout.session.completed`
- **Προϊόντα στο Stripe:** Πρέπει να αντιστοιχούν με τα `stripe_price_id` στον πίνακα `packages` στο Supabase
- **Μοντέλο πληρωμής:** Εφάπαξ ετήσια πληρωμή. ΔΕΝ υπάρχουν αυτόματες ανανεώσεις/subscriptions.

### 3.3 OpenAI
- **Τι κάνει:** Τροφοδοτεί τις αναφορές προόδου μαθητών με ΤΝ
- **Κονσόλα:** https://platform.openai.com
- **Κλειδί που χρειάζεται:** `OPENAI_API_KEY`
- **Μοντέλο που χρησιμοποιείται:** `gpt-4o-mini` (οικονομικό)
- **Rate limit:** 10 αιτήματα/χρήστη/ώρα

### 3.4 Brevo (Email)
- **Τι κάνει:** Στέλνει transactional emails από τη φόρμα επικοινωνίας
- **Κονσόλα:** https://app.brevo.com
- **Κλειδί που χρειάζεται:** `BREVO_API_KEY`

### 3.5 Netlify (Hosting)
- **Τι κάνει:** Κάνει deploy και φιλοξενεί την εφαρμογή Next.js
- **Κονσόλα:** https://app.netlify.com
- **Domain:** protupa.gr
- **Για παράδοση:** Είτε προσθέστε τον νέο προγραμματιστή ως μέλος ομάδας (συνιστάται) είτε δημιουργήστε νέο Netlify account και συνδέστε το με το GitHub repo
- **Όλες οι μεταβλητές περιβάλλοντος πρέπει να οριστούν σε:** Site → Site configuration → Environment variables
- **Μετά από αλλαγές σε env vars:** Απαιτείται νέο deploy για να τεθούν σε ισχύ

### 3.6 GitHub
- **Τι κάνει:** Έλεγχος εκδόσεων (version control)
- **Πρόσβαση:** Προσθέστε τον νέο προγραμματιστή ως collaborator ή μεταφέρετε την ιδιοκτησία του repository

### 3.7 Sentry (Προαιρετικό)
- **Τι κάνει:** Παρακολούθηση σφαλμάτων σε production
- **Κλειδιά που χρειάζονται:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- **Η εφαρμογή λειτουργεί και χωρίς αυτό** — τα σφάλματα απλώς δεν αναφέρονται αυτόματα

---

## 4. Μεταβλητές Περιβάλλοντος (Environment Variables)

Δημιουργήστε αρχείο `.env.local` στον φάκελο του project με αυτές τις τιμές (ποτέ μην το κάνετε commit στο git):

```env
# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Ποτέ μην το χρησιμοποιήσετε σε client-side κώδικα

# ── Site ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://protupa.gr   # Χρησιμοποιείται για URLs ανακατεύθυνσης Stripe

# ── Stripe ────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...             # ή sk_test_... για δοκιμές
STRIPE_WEBHOOK_SECRET=whsec_...

# ── OpenAI ────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Email ─────────────────────────────────────────────────────────────
BREVO_API_KEY=xkeysib-...

# ── Sentry (προαιρετικό) ──────────────────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 5. Εκκίνηση του Project Τοπικά

```bash
# 1. Κλωνοποιήστε το repo
git clone <repo-url>
cd Protypa

# 2. Εγκαταστήστε τα dependencies
npm install

# 3. Δημιουργήστε .env.local με τις τιμές παραπάνω

# 4. Εκκινήστε τον dev server
npm run dev
# Η εφαρμογή τρέχει στο http://localhost:3000

# 5. Εκτελέστε tests
npm test
```

---

## 6. Δομή Project

```
src/
├── app/                        # Next.js App Router σελίδες & API routes
│   ├── page.tsx                # Αρχική σελίδα marketing
│   ├── layout.tsx              # Root layout (Header, Footer, Chatbot)
│   ├── account/                # Dashboard συνδεδεμένου χρήστη
│   │   ├── page.tsx            # Dashboard με KPIs και δραστηριότητα
│   │   ├── profile/            # Διαχείριση προφίλ & συνδρομής
│   │   ├── students/           # Διαχείριση μητρώου μαθητών
│   │   │   └── [id]/           # Ατομικό προφίλ μαθητή + αναφορά ΤΝ
│   │   ├── grading/            # Διεπαφή βαθμολόγησης
│   │   │   └── [id]/           # Βαθμολόγηση συγκεκριμένου διαγωνίσματος
│   │   ├── papers/             # Λήψη διαγωνισμάτων
│   │   ├── school/             # Στατιστικά φροντιστηρίου
│   │   └── history/            # Ιστορικό βαθμολογήσεων
│   ├── admin/                  # Panel διαχειριστή
│   │   ├── news/               # Δημιουργία/επεξεργασία άρθρων
│   │   ├── packages/           # Ορισμός Stripe Price IDs ανά πακέτο
│   │   ├── schools/            # Προβολή όλων των φροντιστηρίων
│   │   ├── parents/            # Προβολή όλων των λογαριασμών γονέων
│   │   ├── simulations/        # Ανέβασμα PDFs διαγωνισμάτων & tags ερωτήσεων
│   │   ├── yli/                # Ανέβασμα PDFs ύλης
│   │   └── chatbot/            # Ερωτήσεις που δεν απάντησε το chatbot
│   ├── api/                    # Backend API routes
│   │   ├── checkout/           # Δημιουργία Stripe session
│   │   ├── webhook/            # Stripe payment webhook
│   │   ├── grade/              # Βαθμολόγηση υποβολής
│   │   ├── contact/            # Αποστολή email μέσω Brevo
│   │   ├── yli/[subject]/      # Παροχή PDF ύλης με signed URL
│   │   └── account/
│   │       ├── exam-paper/[id] # Παροχή διαγωνίσματος με υδατοσήμανση
│   │       ├── export/         # Εξαγωγή δεδομένων (GDPR)
│   │       ├── delete/         # Διαγραφή λογαριασμού
│   │       └── students/[id]/ai-summary/  # Παραγωγή αναφοράς ΤΝ
│   ├── nea/                    # Δημόσια λίστα νέων + σελίδες άρθρων
│   ├── paketa/                 # Σελίδα τιμολόγησης & αγοράς πακέτου
│   ├── signin/ signup/         # Σελίδες σύνδεσης/εγγραφής
│   ├── forgot-password/        # Αίτημα επαναφοράς κωδικού
│   ├── reset-password/         # Ορισμός νέου κωδικού
│   └── auth/callback/          # Callback OAuth/magic link
├── components/                 # Επαναχρησιμοποιούμενα UI components
│   ├── layout/                 # Header, Footer, Chrome, MobileNav
│   ├── PaywallPrompt.tsx       # Component "αγοράστε πακέτο"
│   └── Chatbot.tsx             # FAQ chatbot
└── lib/                        # Business logic & utilities
    ├── types.ts                # Όλα τα TypeScript interfaces
    ├── entitlements.ts         # Έλεγχος πρόσβασης (ποιος βλέπει τι)
    ├── grading.ts              # Απλή βαθμολόγηση (demo)
    ├── scoring.ts              # Βαθμολόγηση με βαρύτητα (live διαγωνίσματα)
    ├── ratelimit.ts            # Rate limiting μέσω Supabase RPC
    ├── stripe.ts               # Lazy αρχικοποίηση Stripe client
    ├── format.ts               # Ελληνικοί formatters
    ├── pdf/watermark.ts        # Λογική υδατοσήμανσης PDF
    └── supabase/
        ├── server.ts           # Server-side Supabase clients
        └── client.ts           # Browser-side Supabase client
```

---

## 7. Σχήμα Βάσης Δεδομένων (Supabase / PostgreSQL)

Όλες οι αλλαγές σχήματος βρίσκονται στο `supabase/migrations/` — εκτελέστε τα με τη σειρά στον SQL Editor του Supabase.

### Κύριοι Πίνακες

#### `profiles`
Δημιουργείται αυτόματα με την εγγραφή χρήστη μέσω auth trigger. Μία γραμμή ανά χρήστη.
- `id` — αντιστοιχεί με `auth.users.id`
- `account_type` — `"school"` (φροντιστήριο) ή `"parent"` (γονέας)
- `is_admin` — boolean· ορίζεται χειροκίνητα στο Supabase για διαχειριστές
- `onboarding_complete` — boolean· ορίζεται όταν το φροντιστήριο συμπληρώσει όλα τα απαιτούμενα στοιχεία
- `marketing_opt_in` — boolean

#### `schools`
Στοιχεία επιχείρησης για λογαριασμούς φροντιστηρίων/γονέων. Μία γραμμή ανά χρήστη.
- `id` — FK σε `auth.users`
- `legal_name`, `trade_name` — επωνυμία & διακριτικός τίτλος
- `afm` — ΑΦΜ
- `doy` — ΔΟΥ
- `contact_person`, `contact_email`, `mobile`
- `address`, `city`, `postal_code`

#### `packages`
Τα διαθέσιμα πακέτα για αγορά.
- `slug` — αναγνωριστικό (π.χ. `parent`, `school-tier-1`, `expansion-5`)
- `name_el` — ελληνικό όνομα εμφάνισης
- `package_type` — `parent`, `school`, `expansion`, ή `legacy`
- `price_cents` — τιμή σε λεπτά ευρώ
- `stripe_price_id` — Stripe Price ID· **πρέπει να οριστεί για να λειτουργήσει η αγορά**
- `duration_days` — για πόσες μέρες ισχύει το πακέτο (όλα είναι 365)
- `max_students` — μέγιστος αριθμός μαθητών για αυτό το πακέτο
- `features` — JSON array από `{label, included}` για τη σελίδα τιμολόγησης

#### `purchases`
Καταγράφει κάθε ολοκληρωμένη πληρωμή. Μία γραμμή ανά αγορά.
- `user_id` — ποιος αγόρασε
- `package_id` — τι αγόρασε
- `stripe_session_id` — Stripe checkout session (μοναδικό· αποτρέπει διπλές χορηγήσεις)
- `expires_at` — η πρόσβαση ισχύει μέχρι αυτή την ημερομηνία

#### `simulations`
Μεμονωμένα σετ διαγωνισμάτων που δημιουργεί ο admin.
- `number` — αριθμός διαγωνίσματος (1, 2, 3...)
- `title` — όνομα εμφάνισης
- `greek_questions`, `math_questions` — πλήθος ερωτήσεων ανά μάθημα
- `questions_url` — path αποθήκευσης για το PDF ερωτήσεων
- `material_url` — path αποθήκευσης για το PDF απαντήσεων
- `grading_closes_at` — προθεσμία· υποβολές μετά από αυτήν αποθηκεύονται αλλά εξαιρούνται από τα στατιστικά

#### `school_simulations`
Συνδέει διαγωνίσματα με φροντιστήρια (ποια φροντιστήρια έχουν πρόσβαση σε ποια διαγωνίσματα).

#### `students`
Μαθητές που έχουν καταχωρηθεί από ένα φροντιστήριο/γονέα.
- `school_id` — FK σε `auth.users` (το φροντιστήριο/γονέας)
- `first_name`, `last_name`, `class_year`
- `subjects` — array από `"greek"` και/ή `"math"`
- `gender`, `mother_name`, `father_name` — προαιρετικά
- `ai_summary` — αποθηκευμένο κείμενο αναφοράς ΤΝ

#### `student_simulation_grades`
Εγγραφές βαθμολογίας ανά μαθητή ανά διαγώνισμα.
- `student_id`, `simulation_id`, `school_simulation_id`
- `score` — 0–100
- `wrong_questions` — array με αριθμούς ερωτήσεων που απαντήθηκαν λάθος
- `submitted_at`

#### `simulation_question_tags`
Μεταδεδομένα ανά ερώτηση που ανεβάζει ο admin.
- `simulation_id`, `question_number`
- `category` — θεματική κατηγορία
- `difficulty` — 1/2/3
- `correct_answer` — ΠΟΤΕ δεν αποστέλλεται στον client

#### `posts`
Άρθρα νέων.
- `slug` — αναγνωριστικό URL (πρέπει να είναι μόνο λατινικά πεζά γράμματα και παύλες — ποτέ ολόκληρα URLs!)
- `title`, `excerpt`, `body`
- `tag` — `"Νέα Θέματα"`, `"Ανακοινώσεις"` ή `"Στατιστικά"`
- `publish_at` — null = πρόχειρο· παρελθοντική ημερομηνία = δημοσιευμένο· μελλοντική = προγραμματισμένο
- `cover_image_url` — αποθηκεύεται στο bucket `news-images`

#### `app_settings`
Key-value αποθήκη για διακόπτες admin.
- `yli_greek_visible` — εμφάνιση/απόκρυψη PDF ύλης Γλώσσας
- `yli_math_visible` — εμφάνιση/απόκρυψη PDF ύλης Μαθηματικών
- `yli_apodesmeusi_visible` — εμφάνιση/απόκρυψη PDF σύστασης αποδέσμευσης

#### `rate_limits`
Χρησιμοποιείται από το RPC `increment_rate_limit` για sliding-window rate limiting.

---

## 8. Ροή Ελέγχου Ταυτότητας (Authentication)

Χρησιμοποιεί **Supabase Auth** με SSR cookie handling.

1. Ο χρήστης εγγράφεται στο `/signup` → Το Supabase στέλνει email επαλήθευσης
2. Ο χρήστης επαληθεύει email → auth callback στο `/auth/callback`
3. Το session αποθηκεύεται σε cookies → το `createSupabaseServerClient()` διαβάζει cookies σε κάθε αίτημα
4. Οι προστατευμένες σελίδες ελέγχουν `supabase.auth.getUser()` → ανακατεύθυνση στο `/signin` αν null
5. Οι admin σελίδες ελέγχουν επίσης `profiles.is_admin = true`
6. Επαναφορά κωδικού: `/forgot-password` → email link → `/reset-password`

**Υπάρχουν δύο Supabase clients:**
- `createSupabaseServerClient()` — χρησιμοποιεί anon key + session χρήστη· εφαρμόζεται RLS
- `createSupabaseServiceClient()` — χρησιμοποιεί service role key· παρακάμπτει ΟΛΑ τα RLS (μόνο σε server-side API routes)

---

## 9. Ροή Πληρωμών (Stripe)

**Όλα τα πακέτα είναι εφάπαξ ετήσιες πληρωμές (ΟΧΙ αυτόματες ανανεώσεις/subscriptions).**

```
Ο χρήστης πατά "Αποκτήστε πακέτο" στο /paketa
  → POST /api/checkout { package_id }
  → Έλεγχος rate limit (5 προσπάθειες/χρήστη/ώρα)
  → Επικύρωση ότι το πακέτο έχει stripe_price_id
  → stripe.checkout.sessions.create({ mode: "payment", ... })
  → Επιστροφή { url: session.url }
  → Ο browser ανακατευθύνεται στο Stripe hosted checkout
  → Ο χρήστης πληρώνει
  → Το Stripe κάνει POST στο /api/webhook
  → Επαλήθευση υπογραφής με STRIPE_WEBHOOK_SECRET
  → event.type === "checkout.session.completed"
  → Insert/upsert γραμμή στο purchases με expires_at = τώρα + 365 μέρες
  → Ο χρήστης ανακατευθύνεται στο /account?purchase=success
```

**Η πρόσβαση ελέγχεται από:**
- `entitlements.ts` → `getActivePackages(userId)` → ελέγχει `purchases.expires_at > now()`
- Κάθε προστατευμένη σελίδα/API route καλεί αυτό — ποτέ ad-hoc queries
- `getStudentLimit()` — αθροίζει το βασικό πακέτο + expansions για το όριο μαθητών

**Για να προσθέσετε Stripe price IDs μετά τη δημιουργία προϊόντων στο Stripe Dashboard:**
- Πηγαίνετε στο `/admin/packages` στην εφαρμογή
- Ή εκτελέστε SQL: `update packages set stripe_price_id = 'price_...' where slug = '...';`

---

## 10. Σύστημα Βαθμολόγησης

Υπάρχουν **δύο συστήματα βαθμολόγησης:**

### Απλή Βαθμολόγηση (`src/lib/grading.ts`)
Χρησιμοποιείται στη δημόσια σελίδα `/demo`. Απλό σωστό/λάθος ανά ερώτηση.

### Βαθμολόγηση με Βαρύτητα (`src/lib/scoring.ts`)
Χρησιμοποιείται σε όλα τα πραγματικά διαγωνίσματα. Σύστημα πόντων:
- Ερωτήσεις 1–10: 2 πόντοι η κάθε μία
- Ερωτήσεις 11–20: 3 πόντοι η κάθε μία
- Ερωτήσεις 21–30: 2 πόντοι η κάθε μία
- Ερωτήσεις 31–40: 3 πόντοι η κάθε μία
- Μέγιστη βαθμολογία: 100 πόντοι

Η βαθμολόγηση γίνεται **μόνο server-side** στο `/api/grade`. Οι σωστές απαντήσεις δεν αποστέλλονται ποτέ στον browser.

### Προθεσμία Στατιστικών
`grading_closes_at` σε κάθε simulation — υποβολές μετά από αυτή την ημερομηνία αποθηκεύονται στη βάση αλλά εξαιρούνται από όλα τα στατιστικά. Αποτρέπει τις καθυστερημένες υποβολές από το να αλλοιώνουν τους μέσους όρους.

---

## 11. Panel Διαχειριστή (`/admin`)

Πρόσβαση: ο χρήστης πρέπει να έχει `profiles.is_admin = true` στη βάση δεδομένων. Ορίζεται χειροκίνητα στο Supabase.

| Σελίδα Admin | Τι κάνει |
|---|---|
| `/admin` | Επισκόπηση dashboard |
| `/admin/news` | Δημιουργία/επεξεργασία/διαγραφή άρθρων νέων |
| `/admin/packages` | Ορισμός Stripe Price IDs για κάθε πακέτο |
| `/admin/simulations` | Ανέβασμα PDFs διαγωνισμάτων, διαχείριση simulations |
| `/admin/simulations/categorizations` | Ανέβασμα Excel με tags/δυσκολία ερωτήσεων |
| `/admin/schools` | Προβολή όλων των λογαριασμών φροντιστηρίων |
| `/admin/parents` | Προβολή όλων των λογαριασμών γονέων |
| `/admin/yli` | Ανέβασμα PDFs ύλης και εναλλαγή ορατότητας |
| `/admin/chatbot` | Προβολή ερωτήσεων που δεν απαντήθηκαν από το chatbot |

### Δημιουργία άρθρου νέων
1. Πηγαίνετε στο `/admin/news` → "+ Νέο άρθρο"
2. Συμπληρώστε τίτλο, κείμενο, κατηγορία (tag), προαιρετική εικόνα
3. Το slug δημιουργείται αυτόματα από τον τίτλο — **μην πληκτρολογείτε URLs στο πεδίο slug**
4. Κάντε κλικ "Δημοσίευση τώρα" για άμεση δημοσίευση
5. Κατά την επεξεργασία δημοσιευμένου άρθρου, κάντε κλικ **"Αποθήκευση"** για να αποθηκεύσετε αλλαγές χωρίς να αποδημοσιεύσετε

### Ανέβασμα διαγωνισμάτων
1. Πηγαίνετε στο `/admin/simulations` → επιλέξτε simulation → ανεβάστε 4 PDFs: ερωτήσεις Γλώσσας, απαντήσεις Γλώσσας, ερωτήσεις Μαθηματικών, απαντήσεις Μαθηματικών

### Ανέβασμα tags ερωτήσεων (Excel)
1. Πηγαίνετε στο `/admin/simulations/categorizations`
2. Ανεβάστε `.xlsx` αρχείο με φύλλα που περιέχουν τον αριθμό του simulation στο όνομά τους
3. Απαιτούμενες στήλες: αριθμός ερώτησης, κατηγορία, δυσκολία (1/2/3), σωστή απάντηση

---

## 12. Όρια Μαθητών & Επέκταση

| Πακέτο | Όριο μαθητών |
|---|---|
| Γονέας | 1 παιδί |
| Φροντιστήριο Tier 1 | 10 μαθητές |
| Φροντιστήριο Tier 2 | 20 μαθητές |
| Φροντιστήριο Tier 3 | 30 μαθητές |
| Επέκταση +5 | +5 επί του βασικού ορίου |

Τα φροντιστήρια μπορούν να αγοράσουν πολλαπλές επεκτάσεις — αθροίζονται. Το `getStudentLimit()` στο `entitlements.ts` αθροίζει το βασικό πακέτο + όλες τις επεκτάσεις.

Όταν ένας χρήστης προσπαθεί να προσθέσει μαθητή πέρα από το όριο, εμφανίζεται modal με επιλογές αναβάθμισης ή αγοράς επέκτασης. Οι λογαριασμοί γονέων βλέπουν μόνο μήνυμα (χωρίς επέκταση — οι γονείς περιορίζονται σε 1 παιδί).

---

## 13. PDFs Ύλης (YLI)

Τρία έγγραφα μπορούν να ανεβούν και να ενεργοποιηθούν/απενεργοποιηθούν στο `/admin/yli`:
- **Ύλη Γλώσσας**
- **Ύλη Μαθηματικών**
- **Σύσταση Αποδέσμευσης Θεμάτων**

Αποθηκεύονται στο Supabase Storage bucket `exam-papers` στα paths `yli/greek.pdf`, `yli/math.pdf`, `yli/apodesmeusi.pdf`.

Οι χρήστες τα κατεβάζουν μέσω `/api/yli/[subject]` το οποίο ελέγχει την ορατότητα στο `app_settings` πριν δημιουργήσει signed URL.

---

## 14. Αναφορές Προόδου με ΤΝ

Βρίσκεται στο `/account/students/[id]` — η κάρτα "AI Ανάλυση".

- **Endpoint:** `POST /api/account/students/[id]/ai-summary`
- **Μοντέλο:** `gpt-4o-mini`
- **Απαιτεί:** Ενεργό πληρωμένο πακέτο (403 χωρίς)
- **Rate limit:** 10 αιτήματα/χρήστη/ώρα
- **Αποθηκεύεται σε:** `students.ai_summary` και `students.ai_summary_generated_at`
- **Prompt:** Παράγει αναφορά 2 σελίδων για γονείς στα ελληνικά. Το system prompt έχει προστασία injection — τα ονόματα μαθητών καθαρίζονται πριν τη χρήση.

---

## 15. Chatbot

Ένα απλό FAQ chatbot διαθέσιμο στις δημόσιες σελίδες (κάτω δεξιά γωνία).

- Οι ερωτήσεις αντιστοιχίζονται με μια προκαθορισμένη λίστα FAQ στο `/src/lib/chatbot/match.ts`
- Ερωτήσεις που δεν αντιστοιχίστηκαν καταγράφονται στον πίνακα `chatbot_misses`
- Ο admin μπορεί να δει τις αναπάντητες ερωτήσεις στο `/admin/chatbot` για βελτίωση του FAQ
- Εάν δεν βρεθεί αντιστοίχιση, εμφανίζεται σύνδεσμος φόρμας επικοινωνίας

---

## 16. Ασφάλεια

- **Οι σωστές απαντήσεις** δεν αποστέλλονται ποτέ στον client — βαθμολογούνται μόνο server-side
- **Το service role key** χρησιμοποιείται μόνο σε server-side API routes, ποτέ σε browser κώδικα
- **Τα Stripe redirects** χρησιμοποιούν server-controlled URLs (env var `NEXT_PUBLIC_SITE_URL`) — ποτέ το Origin header του αιτήματος
- **Επαλήθευση webhook** χρησιμοποιεί Stripe signature verification με `STRIPE_WEBHOOK_SECRET`
- **Rate limiting** στο checkout (5/ώρα), AI summaries (10/ώρα) και φόρμα επικοινωνίας
- **Υδατοσήμανση PDF** αποτυπώνει τον διακριτικό τίτλο του φροντιστηρίου σε κάθε διαγώνισμα που κατεβαίνει
- **RLS (Row Level Security)** είναι ενεργοποιημένο σε όλους τους πίνακες Supabase — οι χρήστες βλέπουν μόνο τα δικά τους δεδομένα

---

## 17. Deployment (Netlify)

Η εφαρμογή είναι deployed στο Netlify συνδεδεμένο με το GitHub repository.

**Για παράδοση:**
- Επιλογή Α (συνιστάται): Netlify team → Settings → Members → Πρόσκληση νέου προγραμματιστή
- Επιλογή Β: Ο νέος προγραμματιστής δημιουργεί δικό του Netlify account, εισάγει project από GitHub, ξανά-εισάγει όλα τα env vars, ενημερώνει DNS

**Κάθε env var από την Ενότητα 4 πρέπει να οριστεί στο Netlify** (Site → Site configuration → Environment variables). Μετά από αλλαγές env vars, απαιτείται νέο deploy.

**Domain:** `protupa.gr` — Το DNS διαχειρίζεται όπου αγοράστηκε το domain. Εάν μετακινηθείτε σε νέο Netlify account, ενημερώστε τα DNS records να δείχνουν στο νέο Netlify site URL.

---

## 18. Σημαντικά / Παγίδες

1. **Next.js 16 async params** — Όλα τα dynamic route params είναι τύπου `Promise<{id: string}>` και πρέπει να γίνουν `await` πριν τη χρήση. Διαφέρει από παλαιότερες εκδόσεις Next.js.

2. **Supabase migrations** — Δεν εφαρμόζονται αυτόματα. Κάθε `.sql` αρχείο στο `supabase/migrations/` πρέπει να εκτελεστεί χειροκίνητα στον SQL Editor του Supabase, με τη σειρά.

3. **Slugs άρθρων νέων** — Πρέπει να είναι μόνο πεζά λατινικά γράμματα, αριθμοί και παύλες (π.χ. `nea-themata-2026`). Ποτέ μην επικολλάτε URL στο πεδίο slug.

4. **Επεξεργασία δημοσιευμένων άρθρων** — Κάντε κλικ **"Αποθήκευση"** (όχι "Αποθήκευση ως πρόχειρο"). Το κουμπί "αποθήκευση ως πρόχειρο" **αποδημοσιεύει** το άρθρο.

5. **Stripe price IDs** — Μετά τη δημιουργία προϊόντων στο Stripe Dashboard, τα price IDs πρέπει να καταχωρηθούν στο `/admin/packages` ή μέσω SQL. Μέχρι τότε τα κουμπιά αγοράς εμφανίζουν "Διαθέσιμο σύντομα".

6. **Rate limits** — Αποθηκεύονται στον πίνακα `rate_limits` του Supabase. Εάν μπλοκαριστείτε κατά τη δοκιμή, καθαρίστε με: `delete from rate_limits where key like 'checkout:%';`

7. **Δύο συστήματα βαθμολόγησης** — `grading.ts` (απλό, χρησιμοποιείται στο demo) και `scoring.ts` (με βαρύτητα, χρησιμοποιείται σε πραγματικά διαγωνίσματα). Μην τα μπερδεύετε.

8. **Τιμές class_year μαθητών** — Αποθηκεύονται ως `"Δημοτικό"` ή `"Γυμνάσιο"` (όχι "Λύκειο" — αυτό έχει αποσυρθεί).

9. **`force-dynamic`** — Σελίδες που χρησιμοποιούν `cookies()` εσωτερικά (μέσω Supabase auth) σημειώνονται με `export const dynamic = "force-dynamic"` για να αποτραπεί λανθασμένη ISR caching.

10. **Flag διαχειριστή** — Ορίζεται χειροκίνητα στο Supabase: `update profiles set is_admin = true where id = '<user-uuid>';`

---

## 19. Εκτέλεση Tests

```bash
npm test
```

Τα tests καλύπτουν: αλγόριθμους scoring, λογική βαθμολόγησης, ελέγχους entitlement, formatters, rate limiting, διαφυγή χαρακτήρων, επικύρωση κωδικού.

---

## 20. Γρήγορη Αναφορά — Slugs Πακέτων

| Slug | Περιγραφή | Τιμή |
|---|---|---|
| `parent` | Πακέτο γονέα (1 παιδί) | 50€ + ΦΠΑ |
| `school-tier-1` | Φροντιστήριο 1–10 μαθητές | 120€ + ΦΠΑ |
| `school-tier-2` | Φροντιστήριο 11–20 μαθητές | 250€ + ΦΠΑ |
| `school-tier-3` | Φροντιστήριο 21–30 μαθητές | 300€ + ΦΠΑ |
| `expansion-5` | +5 επιπλέον θέσεις μαθητών | 30€ + ΦΠΑ |

---

*Αυτό το έγγραφο δημιουργήθηκε κατά την παράδοση του έργου. Για οτιδήποτε λείπει, ανατρέξτε στο Git history και στα inline σχόλια του κώδικα.*
