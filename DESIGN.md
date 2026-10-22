---
name: Kassir
description: The cashier for a small Indonesian shop — plain, dense, and offline.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.141 0.005 285.823)"
  primary: "oklch(0.21 0.006 285.885)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.967 0.001 286.375)"
  muted: "oklch(0.967 0.001 286.375)"
  muted-foreground: "oklch(0.552 0.016 285.938)"
  active: "oklch(0.588 0.158 241.966)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.92 0.004 286.32)"
  ring: "oklch(0.705 0.015 286.067)"
  pay-settled: "oklch(0.596 0.145 163.225)"
  background-dark: "oklch(0.141 0.005 285.823)"
  foreground-dark: "oklch(0.985 0 0)"
typography:
  big:
    fontFamily: "Noto Sans"
    fontSize: "48px"
    lineHeight: 1
    fontWeight: 400
  normal:
    fontFamily: "Noto Sans"
    fontSize: "30px"
    lineHeight: 36
    fontWeight: 400
  small:
    fontFamily: "Noto Sans"
    fontSize: "24px"
    lineHeight: 32
    fontWeight: 400
  tiny:
    fontFamily: "Noto Sans"
    fontSize: "14px"
    lineHeight: 20
    fontWeight: 400
  money:
    fontFamily: "Noto Sans"
    fontSize: "30px"
    fontWeight: 700
    fontVariantNumeric: "tabular-nums"
rounded:
  md: "0.375rem"
  lg: "0.625rem"
spacing:
  tight: "4px"
  group: "8px"
  section: "16px"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.normal}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  chip-mode:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 8px"
  shelf:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

## Overview

Kassir is a desktop cashier for one small shop: React inside a Tauri shell, a local
SQLite file, no server. Two people use it — the cashier at the counter and the owner at
a desk — and the interface is sized for a screen read at arm's length, not for a browser
tab. It is an **Operate** surface: familiarity is a feature, the tool should disappear
into the task, and brand lives in precision rather than expression.

The type is deliberately large. The app has two sizes (`big` is the default at the
counter, `small` for cramped screens), and every text size comes from four tokens so
both hold up.

## Colors

One restrained palette, from shadcn's neutral ramp, tinted very slightly cool
(hue ≈ 286). Ground is pure white (`--background`), text is near-black
(`oklch(0.141 …)`), and secondary text is `--muted-foreground` at ≈4.6:1 on white —
the floor: do not put muted text on a tinted ground (`bg-muted/30` drops it to 4.43:1,
below AA; use the foreground there instead).

Colour does jobs, never decoration:

- **primary** (near-black) — the one action that commits money (`Bayar`, `Simpan`).
- **secondary** — chips, secondary buttons, the shelf band.
- **active** (blue, `oklch(0.588 0.158 241.966)`) — selection and the focused grid cell.
- **destructive** (red) — `Kredit` state, `Hapus`, and refusals.
- **pay-settled** (emerald 600/500 by theme) — `Lunas` only, always paired with the word.
- **border** — hairlines (`1px`) do the separating. There is no elevation system to
  speak of: shadows only on buttons and popovers, never on content.

Dark theme exists as tokens (`.dark`) and is not yet toggled by the app; every surface
must still read correctly when it is.

## Typography

One family: **Noto Sans**, self-hosted variable face (wght 100–900, latin subset). No
display face, no monospace costume — data is set in Noto Sans with `tabular-nums`.

Four sizes, re-resolved per app size:

| token | big | small | line-height |
|---|---|---|---|
| `text-big` | 48px | 36px | 1 |
| `text-normal` | 30px | 20px | 36 / 28 |
| `text-small` | 24px | 18px | 32 / 28 |
| `text-tiny` | 14px | 12px | 20 / 16 |

Rules learned the hard way:

- `@layer base` force-applies `text-normal` to `p, textarea, button, a, label, select,
  input, span`. Sizing a **parent** does not size those children — put `text-small` on
  the element itself or it renders at 30px.
- `dt`/`dd`/`div` inherit, so a `text-small` container is enough for definition lists.
- `text-tiny` is the owner's escape hatch. Agents stop at `text-small`; never use
  `text-xs`/`text-sm`/`text-[Npx]`, which ignore the app size.
- Headings are not styled by default (Tailwind preflight zeroes `h1..h6`); an `<h2>`
  with no size class renders at 16px — always give headings a token.
- Every amount carries `tabular-nums`, so a column of money lines up on the digit.

## Layout

- The shell has a 64px topbar (`small: 44px`); `main` is capped at
  `calc(100vh - 68px)` and every page owns its own scroll.
- **One scroll container per screen.** Panes and bands that must not move are `shrink-0`
  siblings of a single `flex-1 min-h-0 overflow-y-auto` region.
- A shared component that scrolls internally (`Table`'s wrapper is `overflow-y-auto`)
  becomes a second scrollport the moment it is a flex child. On the record ledger it is
  neutralised with `parentClass="max-h-none overflow-visible"` so the band scrolls as one
  and the sticky `thead` tracks the band.
- Money reads as a column: labels left, amounts right-aligned to a shared edge,
  `tabular-nums`, closing figures separated by a hairline rule.
- Responsive behaviour is structural, not fluid type: the `small:` variant swaps to the
  smaller type scale, and grids/tables drop or narrow fixed columns per breakpoint.

## Elevation & Depth

Depth is almost absent by design. Buttons and popovers carry `shadow-sm`; dialogs and
the select/popover surfaces carry the stock shadcn shadow. Nothing in the content area
floats: separation is a hairline border or a tinted band (`bg-muted/30`), in that order
of preference.

## Shapes

Radius comes from `--radius: 0.625rem` (`rounded-lg`), `-2px` for `rounded-md`, `-4px`
for `rounded-sm`. Buttons, chips, inputs and panels use `rounded-md`; a full-height
band may use `rounded-lg`. No pills, no organic masks, no clipped corners.

## Components

- **Buttons** (`~/components/ui/button`): cva with `default | destructive | outline |
  secondary | ghost | link`; base text is `text-normal`, `size="sm"` drops it to
  `text-small`. The same five variants appear on every screen — a button that looks
  different in two places is a bug.
- **Table** (`~/components/ui/table`): `thead` is `sticky top-0` with an opaque
  `bg-primary-foreground` ground; the wrapper scrolls unless told otherwise (see Layout).
- **Calendar** (`~/components/Calendar`): a dialog-backed date picker, rendered as a
  ghost button with a calendar icon. `granularity="instant"` keeps the time of day —
  the right mode for correcting a persisted timestamp.
- **Loader / useStream / useMutation**: data arrives as an Effect stream result; loading
  is a skeleton, errors throw to a typed boundary. A refetch fades the pane
  (`opacity-50 pointer-events-none`) instead of blanking it.
- **The shelf** (`Record/Item/z-Detail/z-Shelf`): the page-level pattern this system
  gained from the record redesign. A record's settlement — subtotal, rounding, total,
  payments, change or the credit state — sits in a tinted band pinned under the ledger,
  with every record-level action in one row beneath it, `Hapus` pushed to the far edge.
  Money on the right, actions on the left of their row; neither ever scrolls away.
- **Identity band** (`Record/Item/z-Detail/z-Identity`): mode chip (`Jual`/`Beli`),
  state (`Lunas` emerald / `Kredit` destructive, always with a dot *and* the word), the
  ULID (truncating, `title` carries the whole), the effective date, and a muted second
  line with the cashier, creation time and the admin-editable paid/credit dates.
- **The page card** (`Home/z-Card`): the panel every Beranda region sits in — white on the
  `bg-muted/50` canvas, one hairline border, no shadow. A `CardHead` carries the region's
  name at `text-small` semibold and the single action that belongs to it ("Kelola",
  "Riwayat", "Lihat"). Cards are the home screen's structure; no other screen needs them.
- **The stat row** (`Home/z-Stats`): the day's three figures as equal cards — label, a
  tinted icon tile (emerald for masuk, amber for keluar, destructive for utang), the
  amount at `text-normal` semibold `tabular-nums`, then one meta line with the count and
  the day-over-day percentage. Utang is the only stat that is itself a link. This is the
  one place the app tints an icon: the tint names the direction of the money, it is not
  decoration.
- **The transaction card** (`Home/z-Ledger`): a card with a column head and full-row links
  — Waktu, Kasir, Jenis, Status (dot plus `Lunas`/`Kredit`, the record page's own
  vocabulary), Total right-aligned. Six rows, so the card closes inside a 1440×900 first
  viewport; below `sm` the row becomes two lines and the amount spans both.
- **The menu** (`Home/z-Menu`): the app's screens as tiles straight on the canvas — icon
  tile, name, one short sentence on what the screen is for, and the Alt key or `admin`
  tag that qualifies it. They are not wrapped in a
  card (a card of cards is nesting); each tile is already a container. Hover is the
  `active` blue, as is Beranda's primary action: on this page blue marks "go somewhere",
  while the near-black primary stays the mark of an action that commits money.

## Do's and Don'ts

Do

- Set size on the element that renders text, not only on its container.
- Right-align money and give it `tabular-nums`; put a hairline rule above a closing figure.
- Use hairlines and the `bg-muted/30` band to separate; shadows are for controls.
- Reserve colour for state and destruction; `Lunas`/`Kredit` always carry their word.
- Keep one scroll container per screen, and keep the settlement and the actions out of it.
- Write in plain Indonesian with the fixed vocabulary: Jual/Beli, Masuk/Keluar, Lunas,
  Kredit, Pembulatan, Kembalian, Kasir, Pemasok, Pelanggan, Catatan, Resi.

Don't

- Put `text-muted-foreground` on a tinted ground (4.43:1) — use the foreground.
- Use `text-tiny`, `text-xs`, `text-sm`, or arbitrary px sizes in the UI.
- Nest scroll containers, or let a `Table` wrapper silently become one.
- Add charts, KPI cards, sparklines or "insight" panels to a record or a money view.
- Use monospace, dashed rules or paper textures outside the Resi (print) reproduction.
- Invent facts the data does not carry: no profit, no averages, no rounded display of a
  stored precision.
