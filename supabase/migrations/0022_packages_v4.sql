-- ──────────────────────────────────────────────────────────────────────────
-- Packages v4: updated pricing + feature lists from boss (2026-06-21).
--
-- Parent:       €50 + ΦΠΑ  (was €0 placeholder)  — 1 student, 3+2 exams
-- School tier1: €120 + ΦΠΑ (unchanged)           — 1-10 students, 10 exams
-- School tier2: €190 + ΦΠΑ (was €250)            — 11-20 students, 10 exams
-- School tier3: €250 + ΦΠΑ (was €300)            — 21-30 students, 10 exams
-- Expansion:    single "+5 students" pack, €30 + ΦΠΑ (was 5 separate packs at €12 each)
-- ──────────────────────────────────────────────────────────────────────────

-- ── 1. Parent package ──────────────────────────────────────────────────────
update packages set
  price_cents = 5000,
  features = '[
    {"label":"Πρόσβαση σε 3+2 διαγωνίσματα","included":true},
    {"label":"Πρόσβαση σε όλα τα παλιά θέματα","included":true},
    {"label":"Άδεια για 1 μαθητή","included":true},
    {"label":"Στατιστικά μαθητή","included":true},
    {"label":"Διάγραμμα προσωπικής πορείας","included":true},
    {"label":"AI σύνοψη επίδοσης μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":false},
    {"label":"Σύγκριση με άλλα φροντιστήρια Ελλάδας","included":false},
    {"label":"Θέση σε σχέση με τις προηγούμενες εξετάσεις","included":false}
  ]'::jsonb
where slug = 'parent';

-- ── 2. School tier 1 (1–10 students, price unchanged at €120) ──────────────
update packages set
  features = '[
    {"label":"Πρόσβαση σε 10 διαγωνίσματα","included":true},
    {"label":"Πρόσβαση σε όλα τα παλιά θέματα","included":true},
    {"label":"Αριθμός αδειών της επιλογής σας","included":true},
    {"label":"Στατιστικά μαθητή","included":true},
    {"label":"Διάγραμμα προσωπικής πορείας","included":true},
    {"label":"AI σύνοψη επίδοσης μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":true},
    {"label":"Σύγκριση με άλλα φροντιστήρια Ελλάδας","included":true},
    {"label":"Θέση σε σχέση με τις προηγούμενες εξετάσεις","included":true}
  ]'::jsonb
where slug = 'school-tier-1';

-- ── 3. School tier 2 (11–20 students): €250 → €190 ────────────────────────
update packages set
  price_cents = 19000,
  features = '[
    {"label":"Πρόσβαση σε 10 διαγωνίσματα","included":true},
    {"label":"Πρόσβαση σε όλα τα παλιά θέματα","included":true},
    {"label":"Αριθμός αδειών της επιλογής σας","included":true},
    {"label":"Στατιστικά μαθητή","included":true},
    {"label":"Διάγραμμα προσωπικής πορείας","included":true},
    {"label":"AI σύνοψη επίδοσης μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":true},
    {"label":"Σύγκριση με άλλα φροντιστήρια Ελλάδας","included":true},
    {"label":"Θέση σε σχέση με τις προηγούμενες εξετάσεις","included":true}
  ]'::jsonb
where slug = 'school-tier-2';

-- ── 4. School tier 3 (21–30 students): €300 → €250 ────────────────────────
update packages set
  price_cents = 25000,
  features = '[
    {"label":"Πρόσβαση σε 10 διαγωνίσματα","included":true},
    {"label":"Πρόσβαση σε όλα τα παλιά θέματα","included":true},
    {"label":"Αριθμός αδειών της επιλογής σας","included":true},
    {"label":"Στατιστικά μαθητή","included":true},
    {"label":"Διάγραμμα προσωπικής πορείας","included":true},
    {"label":"AI σύνοψη επίδοσης μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":true},
    {"label":"Σύγκριση με άλλα φροντιστήρια Ελλάδας","included":true},
    {"label":"Θέση σε σχέση με τις προηγούμενες εξετάσεις","included":true}
  ]'::jsonb
where slug = 'school-tier-3';

-- ── 5. Expansion: consolidate to a single "+5 students for €30" pack ───────

-- Retire the 4 individual packs (1–4 students at €12 each)
update packages set package_type = 'legacy'
where slug in ('expansion-1','expansion-2','expansion-3','expansion-4');

-- The former "expansion-5" (5 students at €60) becomes the canonical pack:
-- +5 students for €30 total.
update packages set
  name_el        = 'Επέκταση +5 Μαθητές',
  description_el = 'Προσθέστε 5 ακόμα μαθητές στο πακέτο σας.',
  price_cents    = 3000,
  min_students   = 5,
  max_students   = 5,
  features       = '[]'::jsonb
where slug = 'expansion-5';
