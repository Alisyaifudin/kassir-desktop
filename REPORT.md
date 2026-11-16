# Laporan Keuangan (`/report`)

A day's money, labelled. The numbers are already computable — `analytics/scope.sql`
is the house definition of *which records a report is about* — so this feature adds
exactly one thing the schema cannot derive: **what each line means in accounting
terms** (Beli, Jual, Diskon, PPN, Admin, Ongkir, `Penyesuaian`, …).

That is the whole reason it is manual. Not the totals.

---

## 1. What already exists (do not re-invent)

| Fact | Where | Consequence for this feature |
| ---- | ----- | ---------------------------- |
| Which records a report is about | `src/services/analytics/scope.sql` | Spliced into every report query. Never write a second definition of "the day's money". |
| Which day a record belongs to | `COALESCE(record_paid_at, record_credit_at, record_created_at)` | A settled credit lands on the day it was **paid**. A day's report can therefore change next month. |
| The `dual` extra twin | `FLAGS.md`, `record_pair_id`, `RECORD_FLAG_ADJUSTMENT` | See §7 — this is the actual "extra quirk". |
| A day picker | `src/components/Calendar.tsx` (`mode="day"/"month"/"year"`) | Reused for the day picker and the period picker. |
| A period picker | `src/components/DateRange.tsx` | Reused for week/month/quarter/year. |
| Local day boundaries | `tz` in `src/lib/constants.ts`, `Temporal` | All ranges are half-open local midnights `[start, end)`. |
| PDF rendering | `src-tauri/src/receipt/` (`printpdf` + `allsorts`) | Followed, not replaced. See §6. |
| Save-dialog file write | `export.rs::export_file` | Extended for bytes + a `PDF` filter. |
| Narrow fs ACL | `src-tauri/capabilities/default.json` | The viewer never touches a path. PDF bytes cross IPC. |
| Page data | `src/components/page-data`, `src/pages/Home`, `src/pages/Setting` | `Report` is a `createPageData` page with one key per independent read. |

---

## 2. Routes

```
/report?time=<ms>&view=klasifikasi        the wizard (default)
/report?time=<ms>&view=laporan            the PDF viewer for that day
/report?time=<ms>&selected=<record_id>    which record the wizard shows
/report?time=<ms>&period=week             aggregated period (week | month | quarter | year)
```

Query params rather than path segments, and **the same param names `/records` uses**
(`time`, `selected`) so the two screens read identically and a link can be moved
from one to the other by changing the path. `useTime` (`pages/Record/use-time.ts` —
lift it to `src/hooks/use-time.ts` and point `Record` at the new path) already gives
the local half-open day and clears `selected` when the day changes; `use-selected`
is the same 20-line hook, `replace: true` for the same reason.

Layout is `/records`' three-column grid, unchanged:

```
GRID = "grid gap-2 h-full overflow-hidden grid-cols-[300px_1px_1fr]"
```

- **No report for the day** → the right pane shows the prompt: *"Belum ada laporan
  untuk 14 Maret 2026."* with **Buat laporan**; when the day has no records at all
  the same pane reads *"Tidak ada transaksi pada hari ini"*. Two different
  sentences, never collapsed into one. **Buat laporan** seeds the defaults (§4.1)
  and selects the first record that still has no category.
- **Nothing selected** → the right pane is empty, exactly like `/records`. It is a
  single click to fill it, and a prompt-until-you-click is worse than nothing.
- **Report in progress / done** → the header's `Klasifikasi | Laporan` tabs decide
  what the right pane holds. `Klasifikasi` is the wizard (§4.2), `Laporan` is the
  PDF with **Unduh PDF** / **Unduh JSON**. The left rail never changes.

---

## 3. Schema (migration 63)

Registered in `src-tauri/src/database/mod.rs`, checksum pinned in
`migration-checksums.json`, enforced by `src/services/db/migration-chain.test.ts`.
Conventions from `migration-43`: `<singular>_<field>`, `STRICT`, ms integers,
ids from `generateId` (26 chars).

### 3.1 `report_categories`

```sql
CREATE TABLE report_categories (
  report_category_id         TEXT PRIMARY KEY,
  report_category_name       TEXT NOT NULL UNIQUE,   -- 'Beli', 'Ongkir', 'Penyesuaian'
  report_category_slug       TEXT NOT NULL UNIQUE,   -- stable handle: 'beli', 'ongkir'
  report_category_builtin    INTEGER NOT NULL DEFAULT 0,
  report_category_order      INTEGER NOT NULL DEFAULT 0,
  report_category_deleted_at INTEGER
) STRICT;
```

Built-ins seeded by the migration: `beli, jual, diskon, ppn, admin, ongkir`.
Custom categories are ordinary rows (`builtin = 0`) and are soft-deleted, never
hard-deleted — an old report must still name the category it used.

### 3.2 `report_lines` — the classification

**One row per classified line.** The line is the natural key: a line belongs to
exactly one record, and a record to exactly one day, so the day a classification
belongs to is *derived*. Nothing is stored twice, so nothing can disagree.

**A listing line is keyed by `record_listing_group_id`, not by a
`record_listing_id`.** `record_listings` holds one row per stock lot *portion*, and
the line the operator entered is the group those portions share — `RecordListing.id`
in `services/record/live.ts:571` is the group id. It is minted once per entered line
by `generateId()`, so it is unique across the database, and it is the only stable
identity a line has. Keying a classification on a portion id would classify one
arbitrary piece of a line that happened to draw from two lots.

```sql
CREATE TABLE report_lines (
  report_line_id          TEXT PRIMARY KEY,
  -- The record: cascade on a real DELETE, and one join for every aggregate.
  record_id               TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  -- A listing line, by the group the operator entered. No FK points here — no
  -- table has it as a primary key, so `record_id` above is what holds the line to
  -- its record.
  record_listing_group_id TEXT UNIQUE,
  -- An extra line. An extra has no portions, so its own id is already the line.
  record_extra_id         TEXT UNIQUE REFERENCES record_extras(record_extra_id) ON DELETE CASCADE,
  report_category_id      TEXT NOT NULL REFERENCES report_categories(report_category_id),
  -- `records.record_updated_at` as it stood when this line was classified.
  -- A mismatch at read time means the record was edited afterwards: the report
  -- shows "berubah" and the day is no longer final. Drift is *detected*, never
  -- silently frozen wrong. (SQLite lets NULLs repeat, so the UNIQUE constraints
  -- above still give "one classification per line".)
  report_line_source_rev  INTEGER NOT NULL,
  -- 1 = filled in by the mode default, 0 = the operator chose it. Not used for
  -- correctness; it is what the classifier's suggestions are built from.
  report_line_auto        INTEGER NOT NULL,
  report_line_at          INTEGER NOT NULL,
  CHECK ((record_listing_group_id IS NULL) <> (record_extra_id IS NULL))
) STRICT;

-- The `UNIQUE` constraints already index each line identity, which is what the
-- "still unclassified?" probes seek on. This one is the other direction: the
-- report's own GROUP BY category, and the guard that refuses to soft-delete a
-- category that past reports still name.
CREATE INDEX report_line_category_idx ON report_lines (report_category_id);
```

`record_id` is a deliberate denormalization, the same one
`product_events.product_id` carries: a report read always needs the record, and
deriving it per row from two different parents would be two joins in every
aggregate. The listings side of that join is already indexed —
`record_listing_group_idx` from `migration-43:464`, put there for
`regroupListings`.

Soft-deleted records keep their classifications (records are soft-deleted, the FK
does not fire), so undeleting a record restores its report rows intact. A mode flip
(`migration-61`) mints new group ids with the new record, so a flipped record loses
its classifications — correct, since the flip writes a different record.

### 3.3 `report_periods` — closure, not content

```sql
CREATE TABLE report_periods (
  report_period_id         TEXT PRIMARY KEY,
  report_period_kind       TEXT NOT NULL CHECK (report_period_kind IN
                             ('day','week','month','quarter','year')),
  report_period_start      INTEGER NOT NULL,   -- local midnight, inclusive
  report_period_end        INTEGER NOT NULL,   -- local midnight, exclusive
  report_period_final      INTEGER NOT NULL DEFAULT 0,
  report_period_final_at   INTEGER,
  report_period_created_at INTEGER NOT NULL,
  report_period_updated_at INTEGER NOT NULL,
  UNIQUE (report_period_kind, report_period_start)
) STRICT;
```

**Totals are deliberately absent.** A stored total is a number that goes stale the
moment a record from that day is edited, a credit settles, or a sync merge lands.
Everything in the report body is recomputed from `records` + `report_lines` on
every open; the period row records only *that a report exists* and *that a period
was closed*, never what it said.

The row's **existence** is the "is there a report for this day?" bit that §2's
prompt reads: **Buat laporan** inserts it (`final = 0`) in the same transaction that
seeds the defaults (§4.1). `final = 1` is written only by `closePeriod` for week /
month / quarter / year — a day never needs closing, because a day is complete when
its lines are (§4.3). A stored total is not what makes a closed period stable; the
per-line `report_line_source_rev` × `records.record_updated_at` comparison is.

If a genuinely immutable printed document is ever required, that is a different
feature: it must snapshot the body **and** the per-line `source_rev` plus a hash,
and the UI must refuse to let it drift. It is not this.

---

## 4. The classifier (the right pane of `/report`)

Per-line categories, and the **record** is the unit of work — the same unit the
operator already knows from `/records`, on the same screen shape.

### 4.1 What is pre-filled — and what never is

| Line | Default | Auto? |
| ---- | ------- | ----- |
| `record_listings` on an `incoming` record | **Jual** | yes |
| `record_listings` on an `outcoming` record | **Beli** | yes |
| `record_extras` | **nothing** | — always a question |

**The goods are the only thing the app annotates for you**, and only because the
record already knows: a line of goods on a sale *is* revenue, on a purchase *is*
cost, because `record_mode` says which way the money moved. Nothing is inferred
from a name.

**A charge is never filled in, and never remembered.** That was decided by the
shop, against an earlier draft of this document which proposed remembering the last
category used for the same `(name, mode)` so the screen would "converge". The
argument that killed it:

> a charge is a free-text string. Nothing in `record_extras` says what "Ongkir"
> means — today it is freight, tomorrow packaging, and on one record it was a typo
> for a product. Recording an answer and replaying it on a later record is
> inventing context that does not exist.

The database makes the point: 140 distinct extra names, and one charge spelled
`Ongkir` / `ongkir` / `ONGKIR` / `uang ongkir`. A remembered answer would apply one
of those meanings to all four.

So **every extra line is a question, every time**, and that is the intended state
of a freshly opened day — not an incomplete seed. `startDay` fills in the goods,
which is why a day with three goods lines and one charge reports `1 dari 4 baris
belum jelas` immediately after **Buat laporan**.

### 4.2 What the screen shows

The `/records` screen, with the right pane replaced by the wizard. The left rail is
the day; the right pane is one record and its categories.

```
┌ Masuk | Keluar   Klasifikasi|Laporan   ‹ 14 Mar 2026 ›   138/150 ┐
├──────────────────────┬─┬─────────────────────────────────────────┤
│ No  Kasir   Waktu  To│ │ No: 01JQ… · Masuk · Budi · 14:02        │
│  43 Budi    14:02  45k│●│ Rekaman 43 dari 150          [ ‹ ] [ › ] │
│  44 Sari    14:03  12k│ │                                          │
│  45 Budi    14:07  89k│ │ No Nama        Satuan  Qty   Total  Kat. │
│  …                    │ │  1. Hanasui    20.000    1  20.000 Jual  │
│                       │ │  2. Roti Bakar 20.000    1  20.000 Jual  │
│                       │ │                                          │
│                       │ │ No Nama        Nilai        Total  Kat. │
│                       │ │    Subtotal                40.000       │
│                       │ │  1. Ongkir      5.000      45.000 Ongkr │
│                       │ │                                          │
│ Total Rp1.234.000     │ │ Total                      45.000       │
└──────────────────────┴─┴─────────────────────────────────────────┘
```

**Left rail** — a navigation rail, not a table:

- Columns `No / Kasir / Waktu / Total`, chronological
  (`ORDER BY COALESCE(paid_at, credit_at, created_at) ASC`), the same order and the
  same figures `/records` shows. A day is ~150 rows and can be thousands, so it is
  virtualized with `@tanstack/react-virtual` — but as a plain list, not a
  `useReactTable`. `/records`' 400 lines exist for sorting, split-payment row
  spans and a sortable header; none of that is here. If it grows past ~120 lines,
  stop and lift the shared parts out of `z-Record/List` instead of forking it.
- A dot (`●`) in the `T` column marks a record carrying a line with no category.
  That is the only status there is — no reviewed flag, no per-record checkbox.
- Total footer, summed the way `z-Record/total.ts` does it (`record_total +
  record_rounding`, per `record_fix`), not by summing floats.
- Clicking selects; `selected` lives in the URL and is the walk cursor.

**Right pane** — the selected record, and nothing else:

- An identity band shaped like `z-Detail/z-Identity.tsx`: record id, mode, cashier,
  effective date/time, and on the second line `Rekaman 43 dari 150` with the two
  `‹ ›` buttons. Those buttons are `setSelected(previous)` / `setSelected(next)` over
  the 
  rail's order — not over a filtered subset, not over the "needs attention" records
  only. Every record of the day is walked, in order, as specified.
- The two tables of `z-Detail/z-Ledger.tsx`, kept as two tables and not flattened
  into one list: `Listings` (No / Nama / Satuan / Modal? / Qty / Total) and
  `ExtrasTable` (No / Nama / Nilai / Total, with the `Subtotal` base row). Each gets
  **one extra column, `Kategori`**, at the right edge — a `components/ui/combobox`
  per line with `onCreate`, so a category the list does not hold yet is typed inline
  and written to `report_categories` in the same action.
- Same column widths and `text-end tabular-nums` conventions as `/records`, so money
  in the report screen lines up with money everywhere else.
- **Every combobox change writes immediately** — one `report_lines` upsert for that
  line. No `Setuju`, no `Simpan`, no bulk accept: `‹ ›` is pure navigation, so
  quitting mid-walk loses nothing and there is only one way to lose nothing.
- A line whose category is a guess (`report_line_auto = 1`: the mode default, or a
  remembered extra name) renders as a subdued badge; a category the operator chose
  renders solid. The operator can see which rows are still guesses without a legend.
- A record with neither listings nor extras (a hand-typed `/transaction` record,
  `record_flag & 1`) has nothing to classify and is out of scope (§7) — the wizard
  says so in one line rather than showing an empty pair of tables.

**The header** is `/records`' header with two changes: `Masuk | Keluar` (`ModeTab`,
reused) and a `Klasifikasi | Laporan` tab pair. The day stepper and `Calendar` are
the same components, and the counter that replaces `/records`' filter/search cluster
is `138/150` — see §4.3 for what the two numbers are.

The counter is *not* "records reviewed". With every line pre-filled almost every
record already has categories, so a reviewed counter would sit at 149/150 and
measure nothing. It counts **lines** (`138 dari 150 baris belum jelas`), which is the
only number that changes when the operator works, and it reaches 0 when the day is
done — which is what §5 gates on. The `●` dots in the rail are the same fact, per
record.

### 4.3 Completion

A day is complete when every line of every in-scope record has a `report_lines`
row **and** no row's `report_line_source_rev` differs from the record's current
`records.record_updated_at`. One query, no state machine — the same query backs the
header counter in §4.2 (counted per record instead of per line):

```sql
SELECT COUNT(*) FROM (
  SELECT rl.record_listing_id AS id FROM record_listings rl
    JOIN records r ON r.record_id = rl.record_id
   WHERE <scope> AND NOT EXISTS (SELECT 1 FROM report_lines x WHERE x.record_listing_id = rl.record_listing_id)
  UNION ALL
  SELECT re.record_extra_id FROM record_extras re
    JOIN records r ON r.record_id = re.record_id
   WHERE <scope> AND NOT EXISTS (SELECT 1 FROM report_lines x WHERE x.record_extra_id = re.record_extra_id)
) -- unclassified
```

### 4.4 Categories screen

`/report/kategori` (or a dialog in the classifier): list, rename, reorder,
add, soft-delete. Follows `pages/Category`'s shape. Built-ins cannot be
soft-deleted while `report_lines` still reference them.

---

## 5. Periods

Same report, different range. **Never** sum a week out of its days — that is where
rounding drift enters, and it makes two code paths that can disagree.

| Kind | Range | Complete when |
| ---- | ----- | ------------- |
| `day` | local midnight → +1 day | §4.3 |
| `week` | ISO Monday → +7 days | every day in range complete |
| `month` | 1st → 1st of next month | every day complete |
| `quarter` | month 1/4/7/10 → +3 months | every day complete |
| `year` | Jan 1 → next Jan 1 | every day complete |

The `Laporan` view of the header carries the period tabs (`Hari | Minggu | Bulan |
Kuartal | Tahun`) and shows **Buat laporan mingguan** (etc.) only once the range is
complete. Pressing it inserts the `report_periods` row (`final = 1`) and keeps you
on `Laporan` — which matches the operator's mental model of "closing a period",
without the report body becoming a snapshot (§3.3). Per §2 the rail stays the day's
records: narrowing to a period narrows the *report*, not the rail.

A period tab with an incomplete range is not disabled — it renders the report with a
banner naming the days still missing (`3 hari belum lengkap`) and a link back to the
first of them. A blank pane with no explanation is what makes an operator think the
feature is broken.

Downloads, both reusing existing transports:

- **JSON** — `export_file` with the report model.
- **PDF** — `report_pdf` → `export_bytes` with a `PDF` filter.

---

## 6. PDF

`src-tauri/src/report/` mirrors `src-tauri/src/receipt/`: serde model, pure layout,
pure render, no Tauri types below the command, covered by `cargo test`.

```rust
#[command]
pub fn report_pdf(data: ReportData) -> Result<Vec<u8>, String>
```

The frontend builds `ReportData` from SQL (one query per section), Rust lays it out.
`printpdf` is already in the tree with `default-features = false` — no HTML engine —
so an A4 table is hand-positioned text: column x-positions, a row cursor, a page
break when `y < margin`, and the totals block re-drawn per page. That is the same
work `receipt/render.rs` already does for a 58 mm roll.

Rejected: **pdfcn**. It sits on Takumi (Rust→napi) / Forme (wasm), which means a
new renderer in the Vite bundle — precisely the decision `receipt/mod.rs` documents
as reversed (`pdf-lib` shipped ~2 MB into the webview and re-subset fonts on every
print). A second PDF stack beside `printpdf` is not worth JSX ergonomics.

**Viewer:** `invoke("report_pdf")` → `Uint8Array` → `Blob({type:"application/pdf"})`
→ `URL.createObjectURL` → `<iframe src>`. Bytes cross IPC; no path is ever named,
so the narrow fs ACL is untouched.

> ⚠ Verify early: `bundle.targets` is `msi`, so the shipped runtime is WebView2
> (Chromium) and an `<iframe>` of a blob PDF renders. Development is on
> Linux/WebKitGTK, where the same iframe is an empty box. Keep
> **Unduh PDF** beside the viewer so the feature is usable before that is sorted,
> and confirm on a packaged build before shipping.

---

## 7. The `extra` quirk, and how it was resolved

The reason a report needs a human is the same reason a machine cannot finish it: a
charge can be money the shop earned, money the shop spent, or **neither**.

### What the `dual` flag does

`FLAGS.md`: an extra with `DUAL_FLAG` books **twice**. A sale carrying "Ongkir
5.000" also commits an extras-only `outcoming` record for the same 5.000, linked by
`record_pair_id`. The customer paid it; the shop paid it to a courier.

`analytics/scope.sql` excludes all of `record_flag & 1`, which covers two unrelated
things: a hand-typed `/transaction` record, and that twin. So the twin — a real
outflow — is dropped from every figure, and margin is overstated by the dual amount.

### What the shop's own database says

Queried against the live `data.db` (70.546 records):

| | |
| --- | --- |
| Records flagged `dual` | **0** |
| Hand-typed `/transaction` records | **0** |

The `dual` feature has never been used, and neither has `/transaction`. So the
exposure above is **0 rupiah in practice** — worth knowing before changing
`scope.sql`, which would move every figure on `/analytics` retroactively.

### The resolution: a line can be left out

The report does not need to know whether the shop kept the shipping money. It needs
the operator to be able to say **"this line is not part of my trade"** — and that is
the `Abaikan` category (`migration-64`).

The report therefore has three intentions per line, not two:

| State | Meaning | Blocks the day? |
| --- | --- | --- |
| a real category | belongs in the report, under that category | no |
| `abaikan` | looked at, deliberately excluded | no |
| no row at all | nobody has looked at it | **yes** |

Exclusion is a *stored decision*, not a missing row, precisely so that "forgot"
cannot masquerade as "excluded" — a line nobody looked at blocks the day, while an
excluded line is listed in the PDF's own **Dikecualikan** section with its name,
direction and amount, so the figures that are shown can be audited against what
they skip.

For a dual Ongkir that is the whole answer: exclude the sale's Ongkir line, the twin
is already out of scope, and both halves vanish — the report nets to zero for a
charge that was never the shop's money.

### What this costs, and what it leaves open

- **`scope.sql` is untouched.** `/analytics` keeps meaning "sales performance",
  which is what it should mean; the report is the money document.
- An outcoming Ongkir row will **never** appear in the report, because the twin is
  out of scope. If the shop ever wants "shipping actually paid to couriers" as a
  figure, that needs the twins in scope — and then the same Ongkir must be
  classified twice, once on the sale and once on the twin. Not worth it for one
  number; the exclusion route gives the same net for one decision.
- **`ReportTotals.dual` is gone** (`billed`/`paid`, `SELECT_DUAL`, the PDF's "Biaya
  ganda" line and its tests). Direction comes from `record_mode` everywhere, which
  is where it was coming from anyway.

---

## 8. Files

```
src/services/report/
  index.ts                 types + service surface + ReportError
  live.ts                  SQL (scope.sql spliced in with ?raw, like analytics)
  period.ts                kind → [start, end) via Temporal; pure, unit-tested
  complete.ts              §4.3 queries
  suggest.ts               §4.1.1 category suggestion
  *.test.ts

src/pages/Report/
  index.tsx                route object
  page.tsx                 the grid: rail + right pane (§2)
  data.ts                  createPageData sources
  use-period.ts            period tab state
  use-view.ts              klasifikasi | laporan
  use-pdf.ts               invoke(report_pdf) → blob URL, revoked on unmount
  z-Header.tsx             view tabs + Calendar stepper + counter
  z-Rail.tsx               virtualized day list, ● for unclassified
  z-RailRow.tsx
  z-Error.tsx              panel-scoped fallback (Record/z-Error.tsx shape)
  z-Prompt.tsx             "buat" vs "tidak ada transaksi" vs "belum dipilih"
  z-Viewer.tsx             PDF iframe + Unduh PDF / Unduh JSON
  z-Detail/
    index.tsx              the wizard for one record
    data.ts                 pageData for the selected record
    z-Identity.tsx          id, mode, cashier, "Rekaman 43 dari 150", ‹ ›
    z-KategoriListings.tsx  Listings + Kategori column
    z-KategoriExtras.tsx    ExtrasTable + Kategori column
    z-KategoriCell.tsx      the combobox + inline category create
    z-OutOfScope.tsx        a record with nothing to classify

src/hooks/use-time.ts                  lifted from pages/Record/use-time.ts (§2)
src/pages/Record/use-time.ts           deleted; Record imports the hook

src-tauri/src/report/
  mod.rs                   ReportData (serde camelCase) + #[command] report_pdf
  layout.rs                A4 geometry, rows, page breaks, totals — pure + tested
  render.rs                printpdf drawing

src-tauri/src/database/61-70/migration-63.sql
src-tauri/src/database/mod.rs            register 63
src-tauri/src/database/migration-checksums.json   pin 63
src-tauri/src/export.rs                  export_bytes(app, name, filter, ext, &[u8])
src-tauri/src/lib.rs                     report_pdf in the handler list
src/route.tsx                            reportRoute
```

---

## 9. Implementation phases

Nine phases, each independently landable and independently verifiable. Nothing in
a phase needs the next one to compile, and every phase leaves `main` shippable.

### Legend

- **[slow]** — a command that must be asked for before running (`cargo check`,
  `cargo test`, `vite build`, e2e, dev server). Never assume a previous yes.
- **[free]** — safe to run unprompted: `bun test <paths>`, `tsc --noEmit`,
  `eslint <paths>`, `git status`.

---

### Phase 0 — Groundwork (no route, no schema, no user-visible change)

**Goal** the three shared pieces the rest of the plan leans on, each shippable on
its own.

**Steps**

0.1 **Lift the day hook.** `git mv src/pages/Record/use-time.ts
    src/hooks/use-time.ts` (and `use-time.test.tsx` beside it). Update the one
    importer, `src/pages/Record/z-Header/index.tsx`, to `~/hooks/use-time`. No
    behaviour change — the file's docs already describe a *day* rather than a
    record page, which is why it moves.

0.2 **`export_bytes` in Rust.** In `src-tauri/src/export.rs`, pull the body of
    `export_file` into a private helper and keep the existing command as a thin
    wrapper, so no frontend call site changes:

    ```rust
    fn save(app: &AppHandle, name: &str, filter: &str, ext: &str, bytes: &[u8])
        -> Result<Option<String>, String>;

    #[command] pub async fn export_file(app, default_name: String, contents: String)
        -> Result<Option<String>, String>   // unchanged; calls save(.., b"JSON", "json", contents.as_bytes())

    #[command] pub async fn export_bytes(app, default_name: String, kind: String,
        bytes: Vec<u8>) -> Result<Option<String>, String>;  // kind: "pdf" | "json"
    ```

    Register `export::export_bytes` in the `generate_handler!` list in `lib.rs`.
    The `spawn_blocking` + dialog reasoning in the file's header comment applies
    unchanged — the dialog blocks, so it still must not run on the main thread.

0.3 **Period math.** `src/services/report/period.ts` — pure, no DB, no React:

    ```ts
    export type PeriodKind = "day" | "week" | "month" | "quarter" | "year";
    export type Range = { start: number; end: number };          // local midnights, [start, end)
    export function rangeOf(kind: PeriodKind, anchor: number): Range;
    export function step(kind: PeriodKind, anchor: number, delta: number): number;
    export function labelOf(kind: PeriodKind, range: Range): string;  // "14 Mar 2026", "14–20 Mar 2026", "Mar 2026", "Kuartal 1 2026", "2026"
    export function daysOf(range: Range): number[];                   // one local midnight per day
    ```

    Week is **ISO** (Monday start) via `Temporal`; quarter is month 1/4/7/10; every
    boundary computed in `tz`, never in UTC.

**Files** `src/hooks/use-time.ts` (+ test), `src/pages/Record/z-Header/index.tsx`,
`src-tauri/src/export.rs`, `src-tauri/src/lib.rs`,
`src/services/report/period.ts` (+ `period.test.ts`)

**Verify** [free] `bun test src/services/report/period.test.ts src/hooks/use-time.test.tsx`,
`tsc --noEmit`, `eslint src/services/report src/hooks` · [slow] `cargo check`

**Done when** period tests pass across the awkward boundaries — ISO week spanning
a month and a year, 31 Dec → 1 Jan, 29 Feb, quarter 4 → next year — and
`export_file`'s existing callers are untouched.

#### Landed

- `src/hooks/use-time.ts` (+ test) — moved by `git mv`, so history follows.
  Importers updated: `pages/Record/page.tsx`, `pages/Record/z-Header/index.tsx`.
  Also corrected the pointer in `src/lib/range.ts`'s doc comment.
- `src-tauri/src/export.rs` — `Kind { title, label, extension }` instead of the
  plan's loose `(filter, ext)` pair, and `export_file` is now a two-line wrapper
  over the shared `save`. Reason for the struct: a `PDF` filter over a `.json`
  default name is the bug the type prevents, and the dialog title differs per kind
  (`Simpan Data` / `Simpan Laporan`). `export_bytes(app, default_name, kind, bytes)`
  accepts `kind: "json" | "pdf"` and refuses anything else with a sentence.
  Registered in `lib.rs`'s `generate_handler!`.
  *Known cost, documented in the file:* `bytes: Vec<u8>` crosses serde's JSON
  encoding (~4× the file). Right shape for a once-per-click save dialog on a few
  hundred kilobytes; revisit if report PDFs grow.
- `src/services/report/period.ts` (+ 31 tests) — one addition to the plan's
  surface: **`zone` is a parameter defaulting to `tz`** on every function. Without
  it the DST claim is untestable; with it, four tests in `America/New_York` prove a
  23-hour spring-forward day is one day, a 25-hour autumn day is one day, and a
  spring-forward week is still seven calendar days. `labelOf`'s day case builds its
  string from `monthNames` rather than calling `formatDate`, which reads the global
  zone and would label a range with a zone the range was not computed in.
- `bun scripts/ci.ts --fast` green (rustfmt, `tsc --noEmit`, eslint).
  **`cargo check` / clippy were not run** — not a [free] command. The Rust side is
  unverified beyond `cargo fmt --check`; the pattern follows `printer.rs:112-124`
  exactly, and `add_filter`'s signature is confirmed against `backup.rs:263`.

---

### Phase 1 — Migration 63

**Goal** the three tables exist, seeded, registered and pinned.

**Steps**

1.1 `src-tauri/src/database/61-70/migration-63.sql` — the SQL of §3, plus the seed:

    ```sql
    INSERT INTO report_categories
      (report_category_id, report_category_name, report_category_slug,
       report_category_builtin, report_category_order)
    SELECT upper(hex(randomblob(13))), name, slug, 1, ord FROM (
      SELECT 'Beli'  AS name, 'beli'  AS slug, 0 AS ord UNION ALL
      SELECT 'Jual',        'jual',        1 UNION ALL
      SELECT 'Diskon',      'diskon',      2 UNION ALL
      SELECT 'PPN',         'ppn',         3 UNION ALL
      SELECT 'Admin',       'admin',       4 UNION ALL
      SELECT 'Ongkir',      'ongkir',      5
    );
    ```

    Ids come from `upper(hex(randomblob(13)))` — 26 chars, the same length
    `generateId` mints, and the precedent `migration-61` set. The **slug** is the
    stable handle the app compares against; the id is only a key.

1.2 Register as `version: 63`, description `create_report_tables`,
    `include_str!("../../src/database/61-70/migration-63.sql")`.

1.3 Pin the checksum (sha384 of the file's raw bytes, `"sha384:" + hex`):

    ```bash
    bun -e 'const c=require("node:crypto"),f=require("node:fs");
      const p="src-tauri/src/database/61-70/migration-63.sql";
      console.log(c.createHash("sha384").update(f.readFileSync(p)).digest("hex"))'
    ```

**Verify** [free] `bun test src/services/db/migration-chain.test.ts` — contiguity,
on-disk ⇄ registered parity, and the pinned hash.

**Done when** that test is green and a fresh boot creates all three tables. Migration
63 is immutable from this point on; later schema work appends 64.

#### Landed

- `migration-63.sql`, registered as version 63 / `create_report_tables`, checksum
  pinned. `bun test src/services/db/migration-chain.test.ts` green (4 tests,
  130 assertions).
- `src/services/db/migration-63.test.ts` added — 19 tests that run the migration
  against the real schema via `makeTestDatabase` and pin the invariants Phase 2/3
  lean on: the six built-ins in order and flagged, ids 26 chars
  (`/^[0-9A-F]{26}$/`), one classification per line, exactly one parent, unknown
  category / missing listing refused, real DELETE cascades while a soft delete does
  not, `(kind, start)` unique, only five kinds, STRICT rejects `'yes'` for
  `report_line_auto`.
- **Two corrections to §3.2**, both found while writing the service (below):
  1. The two proposed indexes on `record_listing_id` / `record_extra_id` were
     dropped — SQLite's `UNIQUE` constraint *is* an index, so they were duplicates.
  2. **The listing anchor changed** from `record_listing_id` (a portion) to
     `record_listing_group_id` (the entered line) plus a `record_id` FK for cascade.
     A `record_listings` row is one stock lot; `RecordListing.id` is the group
     (`live.ts:571`), so keying on a portion would have classified a fragment.
     The migration was amended before shipping, which is why it is safe: 63 is
     still uncommitted, and the immutability rule in `migration-chain.test.ts`
     applies to migrations that have shipped.

---

### Phase 2 — Service: the read side

**Goal** every number and every list the UI needs, queryable and tested, with no
React in sight.

**Steps**

2.1 `src/services/report/index.ts` — `ReportError`, the types
    (`ReportCategory`, `LineCategory`, `DayProgress`, `PeriodDay`, `ReportTotals`),
    and the `ReportService` `Context.Tag`. Surface:

    ```ts
    get: {
      revision: Stream<number, ReportError>;
      categories: Effect<ReportCategory[], ReportError>;
      /** rail rows: the day's records, classification-aware */
      day: (start: number, end: number) => Effect<DayRecord[], ReportError>;
      /** one record's lines + their categories, for the wizard */
      lines: (recordId: string) => Effect<LineCategory[], ReportError>;
      progress: (start: number, end: number) => Effect<DayProgress, ReportError>;
      /** Laporan view with period > day: one row per day in range */
      days: (range: Range) => Effect<PeriodDay[], ReportError>;
      /** the derived report body, for the PDF and the JSON download */
      totals: (range: Range) => Effect<ReportTotals, ReportError>;
    }
    ```

2.2 `src/services/report/live.ts`. **Every query splices `analytics/scope.sql` by
    `?raw`**, exactly as `analytics/live.ts` does — one definition of "the day's
    money" in the codebase, assembled the same way. `scope.sql`'s `{r}` alias and
    `$1`/`$2` first-binding rule are followed literally.

    - `day` = `service.record`-shaped rows (id, mode, cashier, date, total, fix)
      left-joined to `report_lines` for the per-record unclassified count.
    - `progress` = §4.3's unclassified count plus the stale-by-`source_rev` count,
      returned as `{ records, unclassified, stale }`.
    - `totals` = one row per `report_category` with `SUM`, **plus** the dual-charge
      lines §7 requires (`Ongkir ditagihkan` from the sale's `record_extra_flag &
      DUAL_FLAG` extras, `Ongkir dibayar` from the twins), labelled so the two
      never merge.
    - `days` = per-day complete/incomplete counts.

2.3 Wire it: `wiring.ts` adds `reportLive = ReportLive.pipe(Layer.provide(hidden))`
    and `report` to the merged layer. It needs only `hidden` — the *page* composes
    record changes in (see Phase 5), the way `RecordsPage` already does.

**Verify** [free] `bun test src/services/report` — every query against the in-memory
SQLite the other service tests use (`src/services/record/*.test.ts` is the model):
a dual sale, a settled credit, a soft-deleted record, a day with no records, an
extra classified twice.

**Done when** a day's totals match `/analytics`' figures for the same range, and a
dual sale shows both halves.

---

### Phase 3 — Service: the write side

**Goal** the four writes the UI makes, each idempotent and transactional.

**Steps**

3.1 `seedDefaults(start, end)` — the `Buat laporan` transaction:
    `INSERT OR IGNORE` into `report_periods` (`kind='day'`, `final=0`), then
    `INSERT` one `report_lines` row per listing/extra of every in-scope record,
    category = the §4.1 default, `report_line_auto = 1`,
    `report_line_source_rev = records.record_updated_at`. One
    `db.transaction([...])`. Idempotent: re-running seeds only what is missing.

3.2 `setLine(lineId, categoryId)` — upsert one row, `report_line_auto = 0`.
    Bumps `revision`.

3.3 `categories.add(name)` / `.rename(id, name)` / `.reorder(ids)` /
    `.remove(id)` — `remove` is soft and refuses while `report_lines` reference the
    row (§4.4). `add` returns the new row so the combobox can select it without a
    re-read.

3.4 `closePeriod(kind, start, end)` — `Buat laporan mingguan`: refuses unless the
    range is complete (§5); inserts/updates `report_periods` with `final = 1`,
    `final_at = Date.now()`.

**Verify** [free] `bun test src/services/report` — seed is idempotent; a second
`Buat laporan` writes nothing; `setLine` twice keeps one row; `remove` on a
referenced category is refused with a message and not an exception; `closePeriod`
refuses an incomplete week.

**Done when** the seed + classify + close loop is fully covered without any UI.

---

#### Landed

- `src/services/report/live.ts` — read side (`day`, `lines`, `progress`, `days`,
  `totals`, `exists`, `categories`) and write side (`startDay`, `line`, `close`,
  `category`, `categoryOrder`, `add.category`, `delete.category`). Every aggregate
  starts from one shared pair of CTEs (`scoped`, `lines`), so the rail's dots, the
  progress counter and the report body cannot disagree about what a line is.
- `src/services/analytics/scope.ts` extracted so `report` and `analytics` share one
  `scope()` substitution. Two copies is how a fix to `scope.sql` reaches only one
  caller.
- `src/services/report/live.test.ts` (16) and `write.test.ts` (29).

**One trap, worth knowing before Phase 5:** `bun:sqlite` binds arguments by **the
position they appear in the statement, not by their number** — the note at the top
of `analytics/scope.sql`. A seed statement putting `$3` in its select list would
therefore sit textually *before* the scope's `$1`/`$2` in the `WHERE`, take their
values, and silently match nothing. The seed statements compute their timestamp in
SQL (`NOW_MS`) instead of binding one, so only the scope's two placeholders exist.

**The reconciliation test is the important one.** It does not assert a number typed
into the test: it recomputes the record's totals with `linesSubtotal` +
`recalcExtras` from `~/lib/purchase` — the same helpers `transaction/submit` calls
— and asserts the report's category sum equals it. If the line-amount SQL ever
drifts from the domain formula, that test breaks instead of the report quietly
mis-stating a month.

**§7 becomes code.** `ReportTotals.dual` reports the dual charge's two halves. The
twin is picked out by `record_pair_id IS NOT NULL AND record_mode = 'outcoming' AND
record_flag & 1` — the first version filtered on `record_pair_id` alone and
returned 55.000 where 5.000 was right, because *both* halves carry it.

---

### Phase 4 — PDF (Rust)

**Goal** bytes out of a `ReportData`, layout covered by `cargo test`.

**Steps**

4.1 `src-tauri/src/report/mod.rs` — `ReportData` with `#[serde(rename_all =
    "camelCase")]`, mirroring `receipt/mod.rs`'s posture: only the fields the paper
    prints are declared, so the frontend's model can keep growing.

    ```rust
    #[command]
    pub fn report_pdf(data: ReportData) -> Result<Vec<u8>, String>;
    ```

4.2 `layout.rs` — A4 portrait (595.28 × 841.89 pt), margins, a column table with
    `x` offsets, a row cursor that emits a page break when `y < margin`, a repeated
    header per page, and the totals block. Pure `Vec<Row>` in → `Vec<Placed>` out,
    so the arithmetic is testable without `printpdf`.

4.3 `render.rs` — `printpdf` drawing only, reusing `receipt/render.rs`'s font
    loading and `allsorts` subsetting (already in `Cargo.toml` for exactly this).

4.4 Register `report::report_pdf` in `lib.rs`.

**Verify** [slow] `cargo test` in `src-tauri` — 0 rows, 1 row, a body that spills to
page 2, a body that spills to page 3, totals wider than their column.

**Done when** the same `ReportData` renders the same page count twice (no
nondeterminism) and the totals land on the last page only.

---

#### Landed

- `src-tauri/src/pdf_text.rs` — the embedded Roboto faces, their metrics, and the
  subsetter, **lifted out of `receipt/render.rs`** rather than copied. Both
  documents must measure text with the same advances they are embedded with;
  two copies would let a fix reach one and silently not the other.
- `src-tauri/src/report/mod.rs` — `ReportData` (serde camelCase), and
  `report_pdf`, returning `tauri::ipc::Response` so the bytes cross IPC as a raw
  body rather than a JSON array of numbers.
- `src-tauri/src/report/layout.rs` — A4 geometry, page breaks, the repeated table
  header, the totals block, `Halaman N dari M`. Text is measured through a
  `measure` callback, so the whole file is testable with a synthetic ruler and no
  font. 12 tests.
- `src-tauri/src/report/render.rs` — printpdf drawing only. 3 tests.
- `receipt/format.rs` became `pub(crate)` so the report prints money with the same
  id-ID rules (`format_money`) instead of a second formatter that would eventually
  disagree on a separating dot.

**The structural difference from the receipt:** a receipt is one page whose height
is *computed* from its rows; a report is paged, so `layout.rs` owns every position
and every break and `render.rs` only draws what it is handed. That split is what
makes "does a page overflow / did the header get repeated / is `Halaman 2 dari 3`
right" a `cargo test` question instead of a squint-at-a-PDF question.

**The `dual` disclosure is unconditional.** `notes()` prints the dual charge's two
halves even when both are zero — it is the one place the report is knowingly short
of the truth (§7), and a silent omission is the failure mode that section exists to
prevent.

**Two bugs the tests caught before the code shipped:**

1. *The end matter could split.* At 35 rows the totals block fitted, but the notes
   that qualify it did not, so the notes moved to a page of their own — a sheet of
   totals with no sentence saying the range had unclassified lines. `lay_out` now
   measures `totals_height() + notes_height()` as one lump and moves both together.
   This is exactly what `the_totals_block_is_never_split_across_pages` was written
   for, sweeping every row count from 0 to 80 rather than testing one lucky case.
2. *A shadowed name.* The local `notes` in `lay_out` hid the `notes()` function.

`cargo test` 119 passed · `cargo clippy --all-targets -D warnings` clean ·
`cargo fmt --check` clean · `ci.ts --fast` green.

---

### Phase 5 — Page shell and its states

**Goal** `/report` exists, the grid and header are right, and every state of §2
renders — with the right pane still short of the wizard.

**Steps**

5.1 `src/pages/Report/index.tsx` + `src/route.tsx`: `path: "report"`, wrapped in
    `AdminOnly` with `fallback="/records"` (the report exposes margins; the wizard
    rewrites how every past period reads).

5.2 `use-view.ts` (`klasifikasi | laporan`) and `use-period.ts`
    (`day | week | month | quarter | year`), both URL params with
    `{ replace: true }`, both deleting `selected` when their value changes — same
    reason `useTime` deletes it.

5.3 `page.tsx` — the `GRID` from §2, `pageData.Provider`, and the `busy`
    `useDelayedFlag` treatment `Record/page.tsx` uses.

5.4 `data.ts` — `createPageData<ReportData, ReportError>("ReportPage", { cache:
    true })`. Sources, one per independent read (the `page-data` skill: one key per
    read, gated at the leaf):

    ```ts
    // both revisions, so a record edit and a classification both re-read
    const revs = Stream.merge(service.report.get.revision, service.record.get.revision);
    const day   = revs.pipe(Stream.mapEffect(() => service.report.get.day(start, end)));
    const prog  = revs.pipe(Stream.mapEffect(() => service.report.get.progress(start, end)));
    const cats  = service.report.get.categories;
    ```

    A double emission from the merge is harmless: `createPageData` keys its cache
    on `deps`, so the second result is the same result.

5.5 `z-Header.tsx` — view tabs, `Calendar` stepper whose unit follows `period`
    (§ the UI gist), the counter, and the `busy` `fieldset` disable.

5.6 `z-Rail.tsx` / `z-RailRow.tsx` — the virtualized day list, `●` per record with
    an unclassified line, the split `Masuk / Keluar` footer.

5.7 `z-Prompt.tsx` — the three empty states: *no report* (+ **Buat laporan**),
    *no transactions*, *nothing selected*.

**Verify** [free] `tsc --noEmit`, `eslint src/pages/Report` · [slow] dev server, a
look at all three empty states and a day with zero records.

**Done when** every state in §2 is reachable by URL alone — no clicking required to
reproduce a state.

---

#### Landed

- `src/pages/Report/{index,page}.tsx`, `data.ts`, `use-view.ts`, `use-period.ts`,
  `z-{Header,Rail,RailRow,Prompt,Loading,Error,Viewer}.tsx`.
- `src/hooks/use-selected.ts` — **lifted** from `pages/Record`, with its test, and
  three `Record` importers updated. `Report` would otherwise have been a third copy
  of a hook whose two easy-to-get-wrong details are `replace: true` and
  click-the-open-row-closes-it. (`pages/Product/Detail/Image` keeps its own: it is
  a carousel, not a pane.)
- `src/pages/Report/z-Rail.test.tsx` — 8 tests over the real registry
  (`pageData.Provider` + `deps`), not a stand-in: the gate resolving is part of
  what is under test. Each render takes a unique `deps` so the module-level cache
  cannot paint one test's day in the next.

**Where the decisions meet the pixels:**

- The rail is a **list, not the `Table`**, and not a `useReactTable`: no sorting,
  no split-payment row spans, no sortable header — three columns of a navigation
  rail. What is kept from `z-Record/List` is the roving tabindex (one tab stop per
  day, Up/Down/Home/End inside it) and the virtualizer's no-height fallback.
- **Two footer totals, never one.** Summing sales and purchases into a single
  figure is a number that means nothing; each direction is added up per record
  through `roundToFix`, so the footer adds up what the column shows.
- The header carries no `Masuk | Keluar` tabs — a report needs both directions —
  so each rail row has a `↓`/`↑` pill instead. The stepper's **unit follows the
  period**, so a day stepper and a period selector can never disagree about which
  range is on screen.
- `Buat laporan` lives in the empty pane and nowhere else: useful once per day,
  and a permanently visible button that does nothing 364 days a year is clutter.
- `usePeriod`'s setter is not wired yet — the period tabs belong in the `Laporan`
  pane beside the report they scope (phase 7).

**One fix worth noting:** the prompt's day range comes from `rangeOf("day", time)`,
not `time + 86_400_000`. A fixed 24 hours is the one arithmetic error that moves a
takings figure onto the neighbouring date, and `period.ts` exists so there is only
one place that can be right.

`bun test src/pages/Report` 8 passed · `ci.ts --fast` green.

---

### Phase 6 — The wizard

**Goal** one record's lines, with a category on each, auto-saving.

**Steps**

6.1 `z-Detail/data.ts` — its own `createPageData` with two keys (`record` via
    `../Record/Item/data`'s `recordSource`, and `lines` via
    `service.report.get.lines`), `deps={[recordId]}` so selecting another record is
    a *refetch* that keeps the previous pane on screen — the same trick
    `z-Detail/data.ts` in `Record` uses.

6.2 `z-Detail/z-Identity.tsx` — id, mode pill, cashier, time, `Rek. 43/150`, `‹ ›`.
    `‹ ›` = `setSelected(prev/next id)` from the rail's already-loaded order; at
    either end the button is disabled, not hidden.

6.3 `z-Detail/z-KategoriListings.tsx` / `z-KategoriExtras.tsx` — the two tables of
    `Record/z-Detail` with one added `Kategori` column. Same `Table` component,
    same `text-end tabular-nums`, same `parentClass="max-h-none overflow-visible"`
    (the pane is the one scroll container).

6.4 `z-Detail/z-KategoriCell.tsx` — `Combobox` with `onCreate`, the three visual
    states of the UI gist (guess / chosen / missing), and the mutation. **The key
    is that it is the line's own component**: `useMutation` per cell, one
    `setLine` call per change, no parent state, no save button.

6.5 `z-Detail/z-OutOfScope.tsx` — a record with no lines.

**Verify** [free] `bun test src/pages/Report` (a render test per cell state) ·
[slow] dev server: classify an extra, reload, confirm it stuck; walk `‹ ›` to both
ends of the day.

**Done when** classifying a day is possible end to end and a reload changes
nothing about what is shown.

---

#### Landed

- `src/pages/Report/z-Detail/{data,index,z-Identity,z-Listings,z-Extras,z-KategoriCell,z-OutOfScope}.tsx`
  plus `z-KategoriCell.test.tsx`.
- `src/lib/record-money.ts` and `src/lib/record-discounts.ts` — **lifted** from
  `pages/Record/z-Detail/`, tests and 6 importers with them. The report was about
  to be a second consumer of functions that document *why* they exist (the sign
  leads; `record_extra_eff` is stored unrounded and would print five decimals of
  rupiah). A second formatter would eventually disagree with the first about a
  separating dot, and the disagreement would show as two screens quoting different
  money for one record.
- `src/components/ui/combobox.tsx` — its `className` prop was **declared and never
  applied**, so it silently did nothing. Fixed (`cn("pr-9", className)` on the
  input); no existing caller passes it, so no screen changes.

**Auto-save, verified at the source:** `Combobox.onValueChange` fires on a pick
(`combobox.tsx:160`) and on blur (`:239`), not per keystroke — so one write per
decision. Blur reports the value already held, so `KategoriCell` skips that case;
without it, tabbing down a column would fire one no-op write per line.

**A picker now opens when you click into it.** `Combobox`'s input only opened its
list on a keystroke or the chevron, so a field whose whole purpose is choosing from
a list looked like a text box — and on a screen with six of them in a column that
reads as broken. `onClick={(open)}`, not `onFocus`: tabbing through a form must not
pop a listbox on every stop.

**The three states are `data`, not classes.** `data-classification="missing" |
"guess" | "chosen"` on the cell. Asserting Tailwind classes failed on string soup —
the base input class already contains `font-medium` (inside `file:font-medium`) and
`text-muted-foreground` (inside `placeholder:text-muted-foreground`), so neither
discriminates. The attribute is also what an e2e run selects on.

`bun test` 1820 pass · `ci.ts --fast` green · **e2e 7/7 pass**.

---

### Phase 7 — `Laporan` view, periods and downloads

**Goal** the PDF on screen, the period reports, and both downloads.

**Steps**

7.1 `use-pdf.ts` — `invoke<Uint8Array>("report_pdf", { data })` → `Blob` →
    `createObjectURL`, revoked on unmount. One hook, used by the viewer and nothing
    else; the *download* never goes through it (it calls `report_pdf` then
    `export_bytes`, so no object URL is created for a file the user is saving).

7.2 `z-Viewer.tsx` — `<iframe src={url}>` with `Unduh PDF` / `Unduh JSON` from the
    toolbar (not the viewer), and the `DEV` note from §6 about WebKitGTK.

7.3 Period tabs + `Buat laporan mingguan` in the `Laporan` toolbar; stepper unit
    follows `period`.

7.4 Rail switches to days-of-period when `period !== "day"` (§ UI gist), each row
    `Tgl / Rekaman / Status`; clicking a day navigates to `Klasifikasi` for it.

7.5 Incomplete-period banner, with **Lihat yang belum** jumping to the first
    incomplete day.

7.6 Start-up: if no `report_periods` row exists for a period range, the `Laporan`
    view shows the prompt instead of a PDF.

**Verify** [slow] dev server + packaged build: the iframe renders on WebView2 (the
`msi` target), `Unduh PDF` produces a file the OS opens, `Unduh JSON` round-trips
through Phase 2's types.

**Done when** a complete week closes, downloads as PDF and JSON, and the same week
re-opens identically tomorrow.

---

#### Landed

- `src/pages/Report/z-Viewer.tsx` — period tabs, the close button, both downloads,
  the incomplete banner with **Lihat yang belum**, and the `<iframe>`.
- `src/pages/Report/use-pdf.ts` — `invoke("report_pdf")` → `ArrayBuffer` → blob URL,
  revoked on unmount *and* on every data change (an object URL pins its blob for the
  life of the page, and a day of reports would hold every PDF looked at).
- `src/pages/Report/z-DayRail.tsx` — the rail becomes the period's days, each with
  `lengkap` / `N baris`, and clicking one switches to `Klasifikasi` for it.
- `src/services/report/print.ts` (+ 7 tests) — `toReportData` / `toReportJson`, the
  frontend's half of `src-tauri/src/report`'s model. The period's *name* comes from
  this file's table, so the paper's heading and the screen's header cannot disagree.
- `src/lib/export.ts` — `saveBytes(defaultName, kind, bytes)` over `export_bytes`.
- `data.ts` grew `totals`, `days`, `started` and `info`; `deps` now carries **both**
  ranges, because a week report whose *day* changed needs the classifier's reads
  refreshed even though the week did not move.

**Two downloads, two paths.** The PDF is rendered *again* for a download rather
than taken from the viewer's blob URL: a download must not depend on a preview
having been drawn. `null` from the Save dialog is a cancellation, not a failure.

**What Tier-0 can and cannot see here.** `report_pdf` is a Rust command, and the
e2e harness has no Tauri process — so the PDF itself is unverifiable there. The e2e
asserts the toolbar and that a failed render is *reported in the pane* rather than
leaving it blank; the layout is `cargo test`'s job (15 Rust tests, green). The
embedded-PDF caveat from §6 stands: WebKitGTK on this box renders a blank box where
WebView2 does not.

**What the screenshots showed.** The classifier: mode pill, `Rek. 1/2` with `‹`
disabled at the first record, two goods lines and the Ongkir each with a muted
`Jual` cell (all seeded, none missing). The report view: period tabs, `PDF`/`JSON`,
and — in the browser harness, which has no Rust — *"PDF gagal disiapkan"* in the
pane rather than a blank one. Switching to `Minggu` moved the stepper to
`16–22 Nov 2026`, swapped the rail to days (`Tanggal / Rekaman / Status`) and
revealed **Buat laporan mingguan**.

**One label fixed after looking:** the day rail's footer said `Hari lengkap 1/1`
over a seven-day week, which reads as a one-day week. `days()` lists the days that
*have* records — an empty day cannot be incomplete, so there is nothing to show —
so it now says `Hari berisi, lengkap`.

`bun test` 1820 pass · `ci.ts --fast` green · **e2e 7/7 pass**.

---

### Phase 8 — Hardening

**Goal** the things that are nobody's feature but everybody's bug.

**Steps**

8.1 Panel-scoped error fallbacks (`Report/z-Error.tsx`, modelled on
    `Record/z-Error.tsx`) — `createErrorBoundary(ReportError)`, plus a
    `TextError`-style message for the cell mutation. A failed `setLine` must revert
    the combobox to what is on disk, not leave a lie on screen.

8.2 Skeletons: `z-Rail` (headers + 12 rows, mirroring `Record/z-Loading.tsx`), the
    pane, and the viewer. Reserved heights so nothing jumps (`page-data` skill).

8.3 The keyboard loop from the UI gist (`Enter` → next line → next record), behind
    no flag but easy to cut. **Cut.** `Combobox`'s `Enter` picks the highlighted
    option and stays in the field; hijacking it to jump focus would fight the
    component and break `Enter`-to-submit in every other form. Click, or Tab, and
    the arrow is one click away.

#### Landed

- `z-Error.tsx` (panel-scoped, `ReportErrorFallback`) and the cell's own inline
  error under the field — a failed `set.line` shows its sentence and leaves the
  field reading what is on disk, because `Combobox` re-derives its text from
  `value` on blur.
- `RailSkeleton` / `PaneSkeleton`, at real row height so nothing jumps.
- `e2e/report.e2e.ts` — 7 tests: the rail and split totals off the real schema,
  `Buat laporan` seeding and re-reading, the classifier's three cell states and a
  pick that writes with no save button, `‹ ›` stopping at both ends, an empty day
  offering no report, and `AdminOnly` holding against a typed URL.

8.4 `REPORT.md` → final: fold in whatever changed, and add the `records.record_flag`
    / `report_lines` relationship to `FLAGS.md` if Phase 2 needed a new mask.

8.5 [slow] e2e: pick a day → prompt → **Buat laporan** → classify one extra → walk
    to the end → `Laporan` → PDF visible → download.

**Done when** killing the app mid-classification loses nothing, and a `setLine`
failure is visible and self-correcting.

---

### Ordering and size

```
Phase 0 ──► Phase 1 ──► Phase 3 ──► Phase 6 ──► Phase 8
                │           ▲            ▲
                └─► Phase 2 ┘            │
                     │                   │
                     ├──► Phase 4 ──► Phase 7
                     └──► Phase 5 ──────┘
```

- 0 → 1 → 2 is a hard chain (schema before SQL before UI).
- 3 needs 2's types but not 2's queries.
- 4 (Rust) is genuinely parallel to 3, 5 and 6 — different files, different
  language, no shared type beyond `ReportData`'s JSON shape.
- 5 and 6 are the bulk of the visible work; 6 needs 5's grid and rail.
- 7 needs 4 + 5. 8 last.

Landable-in-one-sitting: 0, 1. Landable-in-a-day: 2, 3, 4. Everything else is a
multi-session feature.

---

## 10. Open decisions

### Resolved

**`scope.sql` and `record_pair_id`** — left alone. The flag is vacuous on this
shop's data (0 dual records, 0 adjustments), and pass-through charges are handled
per line with `Abaikan` (§7). Moving `scope.sql` would change every figure on
`/analytics` to fix a 0-rupiah problem.

**`Diskon` as a category** — it only ever sees *extras* named "Diskon"
(−Rp86,2 juta on this database). A *listing's* discount lives in `discounts` and is
netted into the line's amount, so categorising it as well would double count.
Implemented as a **memo line** instead: `Diskon baris (sudah dikurangkan)`, printed
under the totals and never added to them, because printing it as a category would
break the identity that makes the report auditable.

**Renaming a category** — ship as is. A rename is a typo fix most of the time, and
rewriting history is what you want then. "This word now means something else" is
served by *adding* a category.

**Never guess a charge** — the convergence idea (remember the last category per
`(name, mode)`) was removed outright, and so was the case-insensitive variant of it.
See §4.1: a free-text name carries no meaning the app may infer, and the wizard
exists to ask. Only goods lines are filled in, from `record_mode` alone.

### Deferred until sync exists

**Two tills.** `report_categories` / `report_lines` carry no sync trio, unlike
`pockets` — which **is** synced (`{"e":"pocket",…}`, `sync/frames.ts:6`), so an
earlier revision's "local config like pockets" was simply wrong. The precedent that
does apply is `records.record_flag` / `record_pair_id`: local, never synced, because
they annotate a row rather than describing a fact.

The shop's decision: **the report feature is finished before sync is touched.**
When sync arrives, this needs the trio plus a merge rule for "both registers
classified one line differently". Until then, one device, no divergence.

### Open

**None.** Every item this document raised is either implemented or decided.
