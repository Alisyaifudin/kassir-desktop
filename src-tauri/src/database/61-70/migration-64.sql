-- ============================================================================
-- migration-64   `Abaikan` — the category that means "not in this report".
-- ============================================================================
-- A financial report needs a third intention, not two:
--
--   classified   the line belongs in the report, under this category
--   excluded     the operator looked at it and it deliberately does not belong
--   unclassified nobody has looked at it yet — the day is not done
--
-- Without the middle one, a pass-through charge has nowhere to go. A `dual`
-- Ongkir is the case that forced it: the customer paid 10.000 for shipping, the
-- shop paid 10.000 to the courier, and neither belongs in a report of *this
-- shop's* trade. The twin is already out of scope (`scope.sql`, `record_flag`
-- bit 0); excluding the sale's own Ongkir line is what makes both halves vanish
-- and the report net to zero.
--
-- Why a category and not a NULL
-- -----------------------------
-- `report_lines.report_category_id` is NOT NULL, and a missing row already means
-- "not classified yet" — the state that blocks the day. If exclusion were also a
-- missing row, a line nobody ever looked at would vanish from the report exactly
-- as quietly as one that was excluded on purpose, and the takings figure would be
-- short with nothing on the paper to say so. A row with `abaikan` is a *decision*:
-- it counts as classified (the day completes), it is skipped by the totals, and
-- the PDF lists the lines it hides.
--
-- It is `builtin = 1` so it cannot be renamed into something that reads like a
-- real category, and `order = 6` puts it last in every picker — it is the option
-- you reach for deliberately, not the one you fall into.
-- ============================================================================

INSERT INTO report_categories (
  report_category_id, report_category_name, report_category_slug,
  report_category_builtin, report_category_order
) VALUES (
  upper(hex(randomblob(13))), 'Abaikan', 'abaikan', 1, 6
);
