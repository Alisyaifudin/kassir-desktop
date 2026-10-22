---
version: 1
slug: "src-pages-home"
primary_target: "src/pages/Home"
related_targets: []
---

# Beranda (`/`)

**Scope.** The authenticated landing screen both roles see every session. Mode:
**Operate**. Entry points: app launch, the shop name in the topbar, `url_back=/` from
any screen. Nothing outside this folder is in scope.

**Audience and job.** The cashier opens it to ring the next sale; the owner opens it to
read where the money is, what is still owed, and what moved today. The cashier wants one
obvious action; the owner wants the day's facts without hunting.

**Constraints.** Product truth, routes, permissions and the `?url_back=` contract are
fixed. The sky topbar, its tab nav and the Alt+0..5 shortcuts are untouched. Both app
sizes must hold. Facts come only from the `record` and `money` services — no profit, no
averages, no estimate. Money pockets are admin-only (`/money` redirects cashiers).

## Direction contract

**THESIS.** Beranda is the shop's working desk: a compact header, the day's three figures
as cards, the transactions behind them as a table, the pockets beside it, and the app's
screens as a menu. It is a conventional product dashboard on purpose — the operator
rejected the earlier hairline-only, greeting-led page as a wireframe.

**OWN-WORLD.** The app's own tokens on a tinted canvas: white cards with hairline borders
and no content shadows, `rounded-xl`, four-step Noto Sans, `tabular-nums` on every amount.
The `active` blue is the page's accent — Beranda's primary action, card-link hovers, the
menu tiles and focus rings — because it marks "go somewhere" here, while the near-black
primary stays the mark of an action that commits money. The three stat icon tiles are the
only other colour: emerald, amber, destructive, naming the direction of the money.

**STORY.** Owner: Masuk, Keluar and Utang in one row, then the rows behind them and the
pockets beside them. Cashier: `Transaksi Baru` first, the figures, then the same table;
the pocket card and admin-only menu rows do not exist for them.

**FIRST VIEWPORT (1440×900).** Greeting and date at the left with `Catat pembelian` and
`Transaksi Baru` at the right; three stat cards; the transaction card (head, column head,
six rows, footer with the day's count and "Lihat N lagi") filling the rest of the width
with the money card beside it from `xl`. Below the fold, the menu as a grid of tiles straight on the canvas
(icon, name, one short sentence, key tag): five columns on wide, three at `sm`, two at
narrow. Every card top
and bottom aligns; amounts are right-aligned to a shared edge per table.

**FORM.** Composition pinned by the operator: full-bleed width (no max-width cap) and a
wide money rail (up to 540px), both set during the round; the rails collapse below `xl`
so the table keeps its columns.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
