---
version: 1
slug: "src-pages-setting"
primary_target: "src/pages/Setting"
related_targets: []
---

# Pengaturan (`/setting`, `/setting/*`)

**Scope.** The settings section: the hub at `/setting` and the five detail screens it
opens (`profile`, `shop`, `data`, `printer`, `log`), plus their shell — the sidebar, the
page head, the panel. Mode: **Operate**. Entry points: Alt+5 from anywhere, the gear in
the topbar, and the back button's `?url_back=` contract.

**Audience and job.** Both roles land here. The owner changes shop identity, printer and
app identity, printer and data export; the cashier opens Profil. Nobody visits this
section to be impressed — they visit it because one specific thing is wrong.

**Constraints.** Product truth, routes, `AdminOnly` gating, the `?url_back=` contract and
the topbar are fixed. A destination's name and sentence are the hub's, not each page's —
`navItemOf` is the single source. The log console stays at `text-sm` (density is its job).
Facts only: no "rekening", no usage stats, no last-changed dates the database does not
carry.

## Direction contract

**THESIS.** Settings is a table of contents, not a launcher wall. The first screen answers
"where is the thing" with a list, and every screen behind it repeats the row you clicked
in its head, so you always know which door you came through.

**OWN-WORLD.** The app's own tokens on the `bg-muted/50` canvas: hairline panels, no content
shadows, `rounded-xl` panels and `rounded-md` tiles, Noto Sans, `text-base` throughout
with `text-2xl` for a detail page's name. The `active` blue marks "this goes
somewhere" (row hover, chevron, the current sidebar row); the `.tone` ramp colours a
destination's glyph and nothing else. Near-black primary and destructive stay out of this
section — nothing here commits money, and Keluar is an outline button, not a red one.

**STORY.** First: who is signed in and how to leave. Then Akun, Toko, Sistem as rows —
five doors, one sentence each.

**FIRST VIEWPORT (1440×900).** Session band with the monogram and `Keluar` at the far
edge; `Akun` in the 180px rail beside a one-row panel; `Toko` the same; `Sistem` beside
three rows; the
version last. Below `xl` the rail folds above each panel and the list runs full width;
below `xl` the sidebar is gone and the topbar's back button is the way to the hub.

**FORM.** One column of grouped rows, no max-width cap (matching Beranda). Rows are ~96px
at `big`, ~72px at `small`, so a finger on the counter's touchscreen still hits them.

**FINISH.** Reviewed against the incumbent rather than re-imagined: the tinted canvas, the
panel-with-head-bar shape, the `.tone` glyph and the sidebar-as-rail all already existed
on Beranda and the record page. What was removed — the duplicated 48px page title, the
card grid of five 48px labels, the hardcoded `bg-blue-100`-style tiles, the hover
`scale-110` and the staggered mount animation — was the part that read as generated
rather than designed.
