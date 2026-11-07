---
version: 1
slug: "src-pages-combo"
primary_target: "src/pages/Combo"
related_targets: []
---

# Combo (`/combos`)

**Scope.** Admin-only catalogue management route for reusable sale templates. Mode:
**Operate**. The route edits combo definitions; the POS search consumes them. It does not
change stock, transaction history or the other catalogues.

**Audience and job.** The shop owner prepares a named set of sale listings, their
quantities, optional Extra presets and an optional cover, then makes that template
available to the cashier in POS search.

**Constraints.** Existing routes, auth guard, data model and Kassir design system are
fixed. Selecting a combo expands into ordinary listing lines and transaction-wide Extra
snapshots. The component rows are independent; removing one does not remove an Extra.
No sync code is in scope; future sync intent is documented in
`docs/docs/architecture/combos.md`.

## Direction contract

**THESIS.** The combo route is a working catalogue editor, not a new POS or a new visual
world: keep the saved definitions visible beside the editor so an owner can move between
combos without losing context.

**OWN-WORLD.** Inherit Kassir's authenticated shell, Noto Sans, neutral surfaces,
hairline separators, existing form controls and focus blue. No new palette, texture,
illustration or motion; the optional cover is real user content.

**STORY.** The admin scans saved combo names and active states, selects one, edits its
ordered listing quantities and referenced extras, optionally replaces the cover, and
saves. The POS will then surface active, valid combos among listing search results.

**FIRST VIEWPORT.** Page heading and concise explanation above a responsive master-detail
workspace. The combo list is the narrow left column; the editor is the wider right column
with name/status first, listing rows, Extra rows, cover, then save/delete actions. Below
large-screen widths the list and editor stack in the same reading order.

**FORM.** Local extension of the existing product/category/extra management screens; no
concept-seed roll by design. The established catalog-editor pattern is the only form
needed; no new visual identity or raster asset is introduced.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
