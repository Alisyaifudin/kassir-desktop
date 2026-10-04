# Product Pages — Detailed Checklist Plan

> Status: **discussion / planning**. No implementation until the open questions
> at the bottom are resolved. This document is the single source of truth for the
> rewrite and replaces any older Product notes.

---

## 0. Context & ground truth

- [ ] Target schema is **`migration-43` + `44`** (both registered in
      `src-tauri/src/database/mod.rs`). `data.db` / `schema.sql` in the repo are
      stale and will migrate on next app launch.
- [ ] Product aggregate tables: `products`, `listings`, `properties`, `stocks`,
      `images`, `product_events`.
- [ ] `src/services/product/` **does not exist yet** — this rewrite depends on it.
      `src/services/PLAN.md` §3.5 specifies it (unbuilt).
- [ ] Repo has **no chart lib** and **no virtualization lib**; `dnd-kit` is
      available (used by Money). Old chart primitives live under
      `src/pages/Product/Detail/Performance/`.
- [ ] Follow `.pi/skills/services.md` exactly: service owns state, components
      subscribe (`useStream`/`useMutation`), `Loader`/`LoaderMany`, typed
      boundaries, `small:` sizing.
- [ ] Old `src/pages/Product/**` code is **reference only** — no structural
      constraints carried over.

---

## 1. Locked decisions

- [ ] **D1** Routes are **nested** with `<Outlet>` (not internal tab state).
- [ ] **D2** Image tab path is `/products/:id/image` (**singular**).
- [ ] **D3** List state (search/filter/sort/view/page/size) lives in **URL search
      params** — replaces `url_back` query hack.
- [ ] **D4** List uses **client-side filter + pagination**; no infinite scroll,
      no virtualization (see §7).
- [ ] **D5** Build the `product` **service** (`Context.Tag` + `Layer` +
      `SubscriptionRef`) as a prerequisite.
- [ ] **D6** New/Edit share one `Form/` module with per-section subcomponents.

---

## 2. Phase 0 — Service layer (prerequisite)

### 2.1 Extend hidden `db` service

- [x] Add `transaction(statements: Statement[])` to `src/services/db/index.ts`
      (`Statement = { sql: string; bindings?: Binding[] }`).
- [x] **Plugin constraint:** plugin-sql exposes no `transaction` API, but a
      single `execute` call is itself atomic. So implement `transaction` as:
      - join the statement SQL with `;`,
      - flatten the bindings in statement order,
      - call the plain `execute(query, bindings)`.
- [x] **Do NOT add explicit `BEGIN;` / `COMMIT;`** — that would nest inside the
      execute-level transaction. *(Confirmed: each `.execute` is already a
      transaction.)*
- [x] Keep each statement's `$1..$n` numbering local; bindings concatenate in
      statement order.
- [ ] Revisit existing hand-rolled `BEGIN; …; COMMIT;` writes (e.g.
      `customer.delete.byId`) — confirm behavior and normalize to this one
      convention.

### 2.2 Create `src/services/product/`

- [x] `index.ts` — **contract only, no implementation comments**:
  - [x] `ProductError` (`Data.TaggedError`), plus `ProductDuplicateCode`.
  - [x] Types: `CodeKind = "barcode" | "qr"`, `Mime = "image/png" | "image/jpeg"`.
  - [x] `Listing`, `Property`, `ProductImage`, `Stock`, `ProductEvent`.
  - [x] `Product` (list read model) incl. `coverImageId: string | null`.
  - [x] `ProductFull = Product & { stocks; properties; images }`.
  - [x] Inputs: `ListingInput`, `PropertyInput`, `ImageInput`, `ProductInput`.
  - [x] `Context.Tag` with the method surface below.
- [x] `live.ts` — one `SubscriptionRef<ProductState[]>`; `load`/`hydrate`/
      `ensureLoaded`; mutations write DB then re-hydrate the ref.
- [x] `stock-sql.ts` — pure SQL builders (`receiveStatements`, `consumeStatements`,
      `adjustStatements`, `touchProduct`) shared with the future `record` service.

> Status: implementation done; `npx tsc --noEmit` clean for the service files.

### 2.3 Service surface (to lock)

```
get:
  all()            -> Product[]
  byId(id)         -> ProductFull | NotFound
  byCode(value)    -> Product[]        // listing_code scan (barcode/qr)
  unsync()         -> Product[]
  changes          -> Stream<Product[]>
  changesFull      -> Stream<ProductFull[]>
add(input)         -> string           // product + >=1 listing + >=1 stock lot
set:
  info(id,{name,note})
  listing.add(productId, input) -> string
  listing.update(productId, listingId, input)
  listing.remove(productId, listingId)
  property.add(productId, input) -> string
  property.update(productId, propertyId, input)
  property.remove(productId, propertyId)
  image.add(productId, input) -> string
  image.remove(productId, imageId)
  image.reorder(productId, imageIds[])
stock:
  receive(productId,{value,capital})     // new lot + positive event
  consume(productId,{value})             // FIFO across lots + negative events
  adjust(productId, stockId,{value,capital})  // delta event (delta 0 = capital fix)
  history(productId,{before?,limit}) -> ProductEvent[]   // keyset, not in ref
delete(id)          // soft delete (product_deleted_at)
refresh()           // re-hydrate after record commit (allowed exception)
```

### 2.4 Derivations & invariants

- [x] `Product.stock = sum(lot.stock_value)`.
- [x] `Product.capital = weighted average` of lots (`sum(value*capital)/sum(value)`, else 0).
- [x] `Product.coverImageId` = live image with lowest `image_order`.
- [x] `add` enforces `listings.length >= 1` and `stocks.length >= 1`.
- [x] Any child mutation bumps `products.product_updated_at` and clears
      `product_sync_at` (aggregate sync signal).
- [x] Soft delete filters: `*_deleted_at IS NULL` on reads; `stocks` has none.
- [x] Barcode uniqueness surfaces as `ProductDuplicateCode`.

### 2.5 Wiring

- [x] `src/services/index.ts`: `const productLive = ProductLive.pipe(Layer.provide(hiddenLive))`.
- [x] Add `productLive` to `appLive` and `product` to the `service` object.
- [ ] (UI-only, later) `ProductErrorBoundary = createErrorBoundary(ProductError)`.

### 2.6 Data-source mapping per surface

- [ ] Product list → `service.product.get.changes` (hot ref) via `useStream`.
- [ ] Product detail → `service.product.get.changesFull` via `useStream`.
- [ ] Event history → `stock.history` wrapped in `Stream.fromEffect` (param-keyed).
- [ ] Images → part of `ProductFull` (live ref).
- [ ] Performance → `report.productPerformance(id, range)` (see open Q2).
- [ ] All writes → `useMutation(service.product.…)`.

---

## 3. Phase 1 — Routes & shared scaffolding

- [ ] Route tree:
  - [ ] `products` → `ProductsPage`
  - [ ] `products/new` → `NewProductPage` (**admin middleware**)
  - [ ] `products/:id` → `DetailLayout` (header + tabs + `<Outlet/>`)
  - [ ] `products/:id` index → `InfoPage`
  - [ ] `products/:id/image` → `ImagePage`
  - [ ] `products/:id/performance` → `PerformancePage`
- [x] `useListState()` — URL-search-param ↔ typed state (`q`, `kind`, `stock`,
      `margin`, `attention`, `sort`, `dir`, `view`, `page`, `size`).
      → `src/pages/Product/use-list-state.ts`
- [ ] Shared `Form/` module (see §5).
- [x] Error boundary + loading skeletons per page.
      → `z-Error.tsx` (`ProductErrorBoundary`), `z-Loading.tsx`.
- [ ] Sizing via `small:` variant only; `useSize()` only for chart geometry.

---

## 4. Phase 2 — `/products` (list)  ✅ DONE

- [x] Page shell: full-height `flex flex-col`; toolbar (shrink-0) + scrollable
      content + footer (shrink-0); `Loader` over `useStream(changes)`.
      → `src/pages/Product/page.tsx`
- [x] **Toolbar** (`z-Toolbar.tsx`)
  - [x] Title “Produk” + count; attention toggle with badge count.
  - [x] Search input (debounced, clear): name, listing name, code. → `z-Search.tsx`
  - [ ] `/` focuses search *(not implemented yet)*.
  - [x] Filter popover (badge when active): Kind (facets), Stock (Semua/Ada/
        Menipis/Habis), Margin (Semua/Untung/Rugi), Reset. → `z-Filter.tsx`
  - [x] Sort select (Nama/Harga/Modal/Stok/Terbaru) + asc/desc toggle. → `z-Sort.tsx`
  - [x] View toggle: Table / Grid (persisted in `view` URL param). → `z-ViewToggle.tsx`
  - [x] FAB `+` (bottom-right, admin only) → `/products/new`.
- [x] **Table mode** (`z-ProductTable.tsx`): No · Nama (+kind chips) · Harga
      (range) · Modal (weighted) · Stok (badge) · Aksi (detail button). Loss row tint.
- [x] **Grid mode** (`z-ProductGrid.tsx`): responsive `grid-cols-2 md:3 lg:4 xl:5`;
      native-Tauri cover or placeholder, name, price range, stock badge, kind chips,
      loss badge; card clickable.
- [x] **Loading**: table/card skeletons respecting `view`. → `z-Loading.tsx`
- [x] **Empty**: illustration + reset-filter CTA. → `z-Empty.tsx`
- [x] **Footer**: “{from}–{to} dari {total}” · page-size (10/20/50/100) ·
      prev/next + page indicator. → `z-Pagination.tsx`
- [x] Filtering/sorting/attention logic. → `use-filtered.ts`
- [x] Shared bits (`formatPrice`, `priceRange`, `StockBadge`, `LossBadge`,
      `KindChips`). → `z-ProductBits.tsx`
- [x] Native image cover hook. → `src/hooks/use-image.ts`
- [x] Removed obsolete `z-ProductPanel.tsx`.

> Status: implemented and `npx tsc --noEmit` clean (no new errors).

---

## 5. Phase 3 — `/products/new`  ✅ DONE

- [x] Single scrollable column (max-w 3xl) + sticky action bar.
- [x] `useMutation(service.product.add)`; success → `/products/:newId`;
      `ProductDuplicateCode` → inline error. Redirect non-admin to `/products`.
      → `New/page.tsx` (removed broken `~/middleware/admin.ts` import).
- [x] **Sections**
  - [x] Info: `name` (required), `note` (textarea).
  - [x] Listing (repeatable, **min 1**): `name`, `price`, `unit` (>=1, default 1,
        helper “1 pcs = 1, 1 lusin = 12”), `kind` (text + `datalist` suggestions,
        default `retail`), optional `code` + `codeKind` toggle.
  - [x] Stok (repeatable, **min 1 lot**): `value` + `capital`; derived total qty,
        weighted-average capital, value.
  - [x] Properti (repeatable, min 0): `key` + `value`; unique keys validated.
  - [x] Actions: Simpan (pending spinner) · Batal.
- [x] Internal `Form/` module (reused by edit page):
  - [x] `ProductForm.tsx`, `types.ts`, `useProductForm.ts` (plain state + manual
        validation), `z-Section.tsx`, `z-Field.tsx`.
  - [x] `z-InfoFields.tsx`, `z-ListingsFields.tsx`, `z-StocksFields.tsx`,
        `z-PropertiesFields.tsx`.
  - [x] `ProductForm` already accepts `initial` (`draftFromProduct`) + `onCancel`,
        ready for Phase 4.

> Status: implemented; `npx tsc --noEmit` clean for the new files. Deleted dead
> `New/use-submit.ts`.
> Note: form validation is hand-rolled rather than valibot (simpler for the
> repeatable sections); can migrate later if desired.

---

## 6. Phase 4 — `/products/:id` (Info)  ✅ DONE

- [x] `DetailLayout` (`Detail/page.tsx`): back link, product name (from
      `changesFull`), tab strip `Info | Gambar | Performa` (link-based, active
      from `useLocation`), `<Outlet context={{ id }} />`. Removed the old route
      `loader`; `use-id` now reads the outlet context.
- [x] Layout `grid grid-cols-1 lg:grid-cols-[1fr_360px]` (stacks on narrow).
- [x] **Left — edit form** (reuses `Form/`):
  - [x] Info (name/note).
  - [x] Listings: add / update / remove (diffed against the original).
  - [x] Stocks: same editor; existing lots are locked (no remove) and saved via
        `stock.adjust`, new lots via `stock.receive`. Derived totals shown.
  - [x] Manual **Kurangi stok** (`stock.consume`, FIFO) with an optional note →
        `Info/z-StockConsume.tsx`. The note is persisted on the generated
        `product_event` (migration-45 adds `product_event_note`).
  - [x] Properties: add / update / remove (diffed).
  - [x] Single “Simpan” diffs the draft and runs granular operations in one
        `Effect.all`; re-fetches + resets the form afterward.
  - [x] Danger: delete product (soft) with confirm → back to `/products`.
  - [x] Non-admin → read-only `z-UserInfo`.
- [x] **Right — event history** (`History/`):
  - [x] Header: “Riwayat”, filter Semua/Masuk/Keluar (client-side).
  - [x] Rows: waktu · delta (signed, coloured) · modal · lot (`stock_id`) · note.
  - [x] Keyset pagination via `stock.history({ before, limit })` + “Muat lebih
        banyak”; reloads when `product.updatedAt` (revision) changes.
  - [x] Limitation noted: no record link in `product_events` (only `stock_id`),
        so no source-transaction column / running balance yet.
- [x] Added `useQuery(factory, deps)` beside `useStream` in `Loader.tsx` (Q11).
- [x] Cleaned up dead files: `Detail/loader.ts`, `Info/use-product.ts`,
      `Info/z-Loading.tsx`, `History/{use-page,use-mode,z-Loading}.ts`,
      `Info/ProductForm/`, `z-ProductForm`, `z-NoteInput`, `z-BarcodeInput`,
      `util-product-options`.

> Status: implemented; new files `tsc` clean. Old `Image/` and `Performance/`
> pages are still the legacy ones (Phase 5/6).

---

## 7. Phase 5 — `/products/:id/image`  ✅ DONE

- [x] Main large preview of selected image + prev/next. → `z-Preview.tsx`
- [x] Delete selected (confirm-less, direct) and “Jadikan cover” (moves to
      order 0 via a reorder).
- [x] Thumbnail rail, dnd-kit sortable (drag whole thumb, cover badge, delete);
      drop → `service.product.set.image.reorder(id, ids)` (batch). → `z-ThumbRail.tsx`
- [x] Add: hidden `<input type="file">` (png/jpeg, ≤10 MB) → `image.save` writes
      bytes to `AppData/images/<name>` → `service.product.set.image.add`.
      → `z-AddButton.tsx`
- [x] Empty state + local skeleton (`z-Loading.tsx`).
- [x] Non-admin: view-only (no add/delete/reorder).
- [x] Cleaned up: `use-add/use-data/use-del/use-selected/use-change/use-swap/`
      `use-container-size`, `z-ImageControl`, `z-DeleteImg`, `z-ImageDialog`.

> Storage = native Tauri fs (`src/lib/image.ts`, `BaseDirectory.AppData/images`);
> only `image_name`/`image_mime` live in SQLite (Q3). Note: the file picker is a
> browser file input (works with the existing `image.save(File, name)`); bytes
> are still written by Tauri fs. Easy to swap to `dialog.open` later if wanted.

---

## 8. Phase 6 — `/products/:id/performance`  ✅ DONE

- [x] Header: date range (`DateRange`), interval (Hari/Minggu/Bulan) — in URL
      params (`from`, `to`, `interval`). → `use-performance.ts`
- [x] Summary cards: terjual, omzet, laba, margin %. → `z-Summary.tsx`
- [x] Charts (recharts):
  - [x] Penjualan (qty) over time — bar.
  - [x] Omzet over time — bar.
  - [x] Laba over time — line.
  - [x] Stok over time — line (cumulative from `stockOpening` + `product_events`).
  - [x] Omzet per listing — pie.
  - [ ] Modal rata-rata over time — *not added* (capital is per-sale already
        rolled into laba; can add later).
- [x] Data via a product-scoped query `service.product.get.performance(id, {from,to})`
      (returns `sales` from `record_listings ⋈ records` filtered to the product's
      listings + `stockOpening`/`stockEvents`). Full `report` service still deferred
      (Q2).
- [x] `recharts@^3.10.1` installed (Q8).
- [x] `Loader` + skeleton; re-queries when `from`/`to` change (`useQuery`).
- [x] Cleaned up the legacy `Performance/*` files.

> Status: implemented; `src/pages/Product/` is fully `tsc`-clean.

---

## 12. Overall status

All phases (0–6) implemented. `src/pages/Product/` reports **zero** TypeScript
errors (`npx tsc --noEmit`); repo-wide count dropped 336 → 319 (remaining errors
are unrelated legacy files, e.g. the old POS `Record`/sync code).

---

## 9. Pagination / infinite scroll / virtualization (explicit)

- [ ] **Product list → client-side pagination.** Whole catalog is already in the
      `SubscriptionRef`; fuzzy search + facets need the full set; typical scale is
      hundreds–low-thousands. No infinite scroll, no virtualization.
- [ ] Revisit only above ~2–3k rows → then virtualize the grid/table body
      (requires a new dependency).
- [ ] **Event history → keyset pagination** (`before`/`limit`); journal is unbounded.
- [ ] **Performance → range query**; no paging.

---

## 10. Proposed file tree

```
src/services/product/
  index.ts
  live.ts
  stock-sql.ts
src/pages/Product/
  index.tsx
  Products.page.tsx
  z-ProductToolbar.tsx  z-Search.tsx  z-Filter.tsx  z-Sort.tsx  z-ViewToggle.tsx
  z-ProductTable.tsx  z-ProductRow.tsx  z-ProductGrid.tsx  z-ProductCard.tsx
  z-Pagination.tsx  z-Empty.tsx  z-Loading.tsx
  use-list-state.ts  use-filtered.ts
  Form/
    ProductForm.tsx  schema.ts  useProductSubmit.ts  z-Section.tsx
    z-InfoFields.tsx  z-ListingsFields.tsx  z-StocksFields.tsx  z-PropertiesFields.tsx
  New/{index.tsx, page.tsx, z-Loading.tsx}
  Detail/
    index.tsx  page.tsx  z-Tabs.tsx  z-Header.tsx  use-id.ts
    Info/{index.tsx, page.tsx, z-EditPane.tsx, z-UserInfo.tsx}
    Info/History/{index.tsx, z-HistoryTable.tsx, z-Filters.tsx, use-history.ts}
    Image/{index.tsx, page.tsx, z-Preview.tsx, z-ThumbRail.tsx, z-AddBtn.tsx, use-reorder.ts}
    Performance/{index.tsx, page.tsx, z-Summary.tsx, z-Charts.tsx, use-performance.ts}
```

---

## 11. Open questions — RESOLVED

- [x] **Q1 Service first?** → Done: `src/services/product/{index,live,stock-sql}.ts` + `services/index.ts`.
- [x] **Q2 Performance data** → **Deferred / pending.** Performance route will be
      built last; decide `report` vs temporary `product.performance` at that time.
- [x] **Q3 Images storage** → **Native Tauri filesystem + path in SQLite.** Reuse
      `src/lib/image.ts` (`BaseDirectory.AppData/images/<name>`); `image.save`
      writes bytes, `image.load` returns an object URL, `image.del` removes.
      Persist only `images.image_name` (the stored file name/path) + `image_mime`.
- [x] **Q4 List thumbnails** → **Yes**: `Product.coverImageId` (already in the
      service). Cards resolve the cover via `src/lib/image.ts`.
- [x] **Q5 Listing `kind`** → **Free text + suggestions** (`retail`, `wholesale`,
      `marketplace`), default `retail`.
- [x] **Q6 Codes** → **One code per listing** (`listing_code` +
      `listing_code_kind`); no separate `codes` concept.
- [x] **Q7 New-product stocks** → **Multiple initial lots allowed** (min 1).
- [x] **Q8 Charts** → **Add `recharts`** for the performance page.
- [x] **Q9 Route naming** → **`/products/:id/image` singular** (and `/performance`).
- [x] **Q10 Non-admin detail** → **Read-only**; no quick stock adjust for non-admin.
- [x] **Q11 Query hook** → **Add `useQuery(effectFactory, deps)`** beside
      `useStream` in `Loader.tsx` for history/performance params.
- [x] **Q12 Attention filter** → **Extend** beyond `capital >= price` with
      low-stock / out-of-stock thresholds.
