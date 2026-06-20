-- ──────────────────────────────────────────────────────────────────────────
-- Packages v3: 3 school tiers, parent limited to 1 child, expansion add-ons.
--
-- Changes:
--   • Parent package: max_students 2 → 1
--   • School tiers: 4 → 3 (1–10/€120, 11–20/€250, 21–30/€300)
--   • school-tier-4 (21–25) retired → package_type='legacy'
--   • New package_type 'expansion' for student slot add-ons (€12/student)
-- ──────────────────────────────────────────────────────────────────────────

-- Extend the check constraint to include 'expansion'.
alter table packages drop constraint if exists packages_package_type_check;
alter table packages add constraint packages_package_type_check
  check (package_type in ('legacy', 'parent', 'school', 'expansion'));

-- Parent: limit to 1 child (was 1–2).
update packages set
  max_students = 1,
  features = '[
    {"label":"Πρόσβαση σε όλα τα διαγωνίσματα","included":true},
    {"label":"Έως 1 παιδί","included":true},
    {"label":"Στατιστικά για κάθε παιδί","included":true},
    {"label":"Διάγραμμα προσωπικής πορείας","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":false},
    {"label":"Σύγκριση με όλα τα φροντιστήρια Ελλάδας","included":false}
  ]'::jsonb
where slug = 'parent';

-- School tier 1: 1–10 students, €120.
update packages set
  min_students = 1,
  max_students = 10,
  price_cents  = 12000,
  name_el      = 'Φροντιστήριο · 1–10 μαθητές',
  features = '[
    {"label":"Πρόσβαση σε όλα τα διαγωνίσματα","included":true},
    {"label":"Έως 10 μαθητές","included":true},
    {"label":"Στατιστικά για κάθε μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":true},
    {"label":"Σύγκριση με όλα τα φροντιστήρια Ελλάδας","included":true}
  ]'::jsonb
where slug = 'school-tier-1';

-- School tier 2: 11–20 students, €250.
update packages set
  max_students = 20,
  price_cents  = 25000,
  name_el      = 'Φροντιστήριο · 11–20 μαθητές',
  features = '[
    {"label":"Πρόσβαση σε όλα τα διαγωνίσματα","included":true},
    {"label":"Έως 20 μαθητές","included":true},
    {"label":"Στατιστικά για κάθε μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":true},
    {"label":"Σύγκριση με όλα τα φροντιστήρια Ελλάδας","included":true}
  ]'::jsonb
where slug = 'school-tier-2';

-- School tier 3: 21–30 students, €300 (was 16–20).
update packages set
  min_students = 21,
  max_students = 30,
  price_cents  = 30000,
  name_el      = 'Φροντιστήριο · 21–30 μαθητές',
  features = '[
    {"label":"Πρόσβαση σε όλα τα διαγωνίσματα","included":true},
    {"label":"Έως 30 μαθητές","included":true},
    {"label":"Στατιστικά για κάθε μαθητή","included":true},
    {"label":"Συνολικά στατιστικά φροντιστηρίου","included":true},
    {"label":"Σύγκριση με όλα τα φροντιστήρια Ελλάδας","included":true}
  ]'::jsonb
where slug = 'school-tier-3';

-- Retire the old fourth tier (21–25 μαθητές).
update packages set package_type = 'legacy'
where slug = 'school-tier-4';

-- Expansion add-on packages: +1 to +5 students at €12 each.
-- These are purchased alongside a base school package to raise the student cap.
insert into packages (
  slug, name_el, description_el,
  package_type, min_students, max_students,
  price_cents, duration_days, billing_interval,
  features
) values
  ('expansion-1', 'Επέκταση +1 Μαθητής', 'Προσθήκη 1 επιπλέον μαθητή.',  'expansion', 1, 1, 1200, 365, 'year', '[]'::jsonb),
  ('expansion-2', 'Επέκταση +2 Μαθητές', 'Προσθήκη 2 επιπλέον μαθητών.', 'expansion', 2, 2, 2400, 365, 'year', '[]'::jsonb),
  ('expansion-3', 'Επέκταση +3 Μαθητές', 'Προσθήκη 3 επιπλέον μαθητών.', 'expansion', 3, 3, 3600, 365, 'year', '[]'::jsonb),
  ('expansion-4', 'Επέκταση +4 Μαθητές', 'Προσθήκη 4 επιπλέον μαθητών.', 'expansion', 4, 4, 4800, 365, 'year', '[]'::jsonb),
  ('expansion-5', 'Επέκταση +5 Μαθητές', 'Προσθήκη 5 επιπλέον μαθητών.', 'expansion', 5, 5, 6000, 365, 'year', '[]'::jsonb)
on conflict (slug) do nothing;
