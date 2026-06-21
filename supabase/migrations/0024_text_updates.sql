-- ──────────────────────────────────────────────────────────────────────────
-- Text/label updates:
--   1. Parent package description updated to Πρότυπα Σχολεία messaging
--   2. class_year values renamed: Γυμνάσιο→Δημοτικό, Λύκειο→Γυμνάσιο
-- ──────────────────────────────────────────────────────────────────────────

-- Update parent package description
update packages
set description_el = 'Για γονείς που προετοιμάζεται το παιδί τους για τις εξετάσεις των Προτύπων Σχολείων'
where slug = 'parent';

-- Rename class_year values in students table.
-- Order matters: rename Γυμνάσιο first so the second update can safely
-- assign the Γυμνάσιο value to former Λύκειο students without conflict.
update students set class_year = 'Δημοτικό' where class_year = 'Γυμνάσιο';
update students set class_year = 'Γυμνάσιο' where class_year = 'Λύκειο';
