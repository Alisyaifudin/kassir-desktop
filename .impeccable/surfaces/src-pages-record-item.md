---
version: 1
slug: "src-pages-record-item"
primary_target: "src/pages/Record/Item"
related_targets: []
---

# Record page (`/records/:recordId`)

**Scope.** One saved record, read in full: the ledger (Detail) and the printer's
reproduction (Resi). Entry points: the day list's right pane ("Lihat"), comprehensive
search, the debt table, and the "Lihat detail" link after a sale. Mode: **Operate**.

**Audience and job.** The owner reconciling the day and the cashier answering a customer,
about equally, at a desk with mouse and keyboard. They arrive with one question — *what
does this transaction actually say?* — and, when it is wrong, one follow-up: *who fixes
it, and where?*

**Constraint the redesign answers.** Today the actions are buried and split: the money
ends at the bottom of a long scroll, "Lihat" and "Hapus" live in one footer row, and
corrections (note, mode, credit, dates) are scattered between that row and a dialog. The
redesign must put the money and every record-level action in one place that never scrolls
away. Fixed by the brief: the Resi reproduction, the routes and `?tab=` contract, every
action's permissions, and the app's design system (tokens, Noto Sans, the four-step type
scale, shadcn primitives, light/dark). Refused: dashboard-ification (charts, KPI cards,
insight panels).

## Direction contract

**THESIS.** A record is a ledger with a settlement, so the page is one: an identity band
that says what this is, a body that scrolls the goods, and a shelf that never leaves with
the money and the corrections in it. It refuses the category-default "long page with a
footer" and the dashboard reflex of turning a single record into metrics.

**OWN-WORLD.** The app's own: near-white ground, hairline `border` rules, `bg-muted/30`
for the shelf and tabs, `--active` blue reserved for focus/selection, emerald for Lunas,
destructive red for Kredit and Hapus, Noto Sans only, `tabular-nums` on every amount, the
`text-big/normal/small` tokens with the `small:` variant respected.

**STORY.** In the first two seconds: Jual, Lunas, which id, when, who. Then the goods, at
the precision they were rung up. The shelf answers the money question without scrolling —
subtotal, rounding, total, each payment, the change — and holds every correction beside
it, so "who fixes it" is answered by looking down, not by hunting.

**FIRST VIEWPORT (1440×900).** Tab strip (`Detail | Resi`) at the top left. Under it the
identity band: `Jual` and `Lunas` chips, `No: 01J8Z…` on the same line right-aligned
against `14 Agu 2025, 14:03`; a second, muted line carries `Kasir Siti` and the
admin-editable `Dibayar` / `Kredit` date chips. The body scrolls the line table (No, Nama,
Satuan, Modal when purchase, Qty, Total, discounts indented beneath their line), then the
extras table and the parties/note block. The shelf is pinned at the bottom, full width,
`bg-muted/30` with a top hairline: a two-column money grid on the right (charges |
payments + change) with `Total` the heaviest figure, and the actions in one row beneath —
`Bayar` (primary, only on an unpaid credit) then `Sunting`, `Jadikan Transaksi`, and
`Hapus` pushed to the far edge.

**FORM.** "Settlement shelf", position 3 of my ordered list (structures 1–7: reconciliation
split, document sheet with rail, **settlement shelf**, command bar, fact-anchored actions,
receipt-anatomy column, inspector split). Seed key `d6565944`. The signature move is the
shelf itself: the four money questions and the five corrections occupy one anchored band
that is identical on every record, whatever the ledger above it does.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
