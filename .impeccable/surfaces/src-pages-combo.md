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

**THESIS.** `/combos` is a scannable catalogue, not a split-pane editor: keep its search,
filters and view controls together, then let a dedicated create/edit route own the full
combo form.

**OWN-WORLD.** Inherit Kassir's authenticated shell, Noto Sans, neutral surfaces,
hairline separators, existing form controls and focus blue. No new palette, texture,
illustration or motion; the optional cover is real user content.

**STORY.** The admin searches and filters saved combo definitions by availability and
contents, sorts them, and chooses cards or a table. Opening a row enters its edit route;
the plus action starts a new definition. The POS consumes active, valid combos among
listing search results.

**FIRST VIEWPORT.** `/combos` keeps the Product catalogue rhythm. Create/edit routes use
the POS shell: a top bar with Back, title and combo settings dialog; a main 12-column work
grid that switches between Listing and Extra stages; and a fixed lower strip with only Grand
total and Simpan. Listing rows use the shared `listing-grid.ts` cell geometry, keyboard
selection/editing and row reordering; catalog matches use POS's queried, virtualized card
grid. No payment, change, rounding or method controls appear; stage content owns the only
scroll region.

**FORM.** Reuse POS's grid conventions rather than inline controls: quantity edits live in
the selected `Cell`, keyboard arrows navigate the 12-column model, and the grip reorders
rows. Listing search calls the listing service after the POS debounce and only renders the
matching virtualized card grid. Active state and cover are grouped in a settings dialog
opened from the top bar. Grand total remains listing subtotal plus ordered Extras using POS
running-percent/flat-value arithmetic; there are no payment or rounding inputs. Simpan
commits the existing ComboInput. No concept-seed roll or new visual identity.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
