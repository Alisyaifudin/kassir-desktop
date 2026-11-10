---
sidebar_position: 12
---

# Combo templates

## Current implementation

A combo is catalogue master data, not a listing and not a transaction line. It has an ordered set of listing references with a quantity and an optional per-listing discount stack per component, an ordered set of references to existing `extras` presets, an active flag, and an optional cover image. `ComboService` owns `combos`, `combo_listings`, `combo_discounts`, and `combo_extras`.

The authenticated `/combos` page is admin-only. Active combos with available component listings and Extra presets are searchable from both the POS and Restock listing searches, and carry a **Kombo** badge in the result grid. Combos are scored by the same ladder as listings (`src/lib/search/index-cache.ts`) and merged into one relevance-ordered list: the template's own name ranks just under a listing's own name, so a perfectly typed combo name lands above every partial listing match (typing `nasi` reaches a combo called `Nasi` before the `Hanasui` listings that merely contain the letters), while an exact listing name still wins a tie. Selecting one copies the current listing values (name, code, unit, price, product and cover) into ordinary `tx_listings` rows and copies the current Extra values into ordinary `tx_extras` rows. The same expansion works for a sale and a purchase; the cart's own direction decides what those rows mean. Repeated component listings merge into the matching cart line like a regular listing selection. The combo template is not attached to the resulting cart rows.

**Combo Extras retain the existing transaction-wide behavior.** A negative value is a discount and applies across the whole cart, including items unrelated to the combo. Removing a component does not remove its Extra. Each selection appends the referenced Extra again. Once expanded, the cart and the eventual record contain ordinary listing and Extra snapshots; editing or deleting the template does not change them.

**Combo component discounts are per listed line.** `combo_discounts` mirrors the transaction line's discount stack: an ordered set of `number`, `percent` or `pcs` rules. The rupiah effect is derived at expansion time from the component's current catalogue price and quantity, so a price change is reflected without rewriting the template. Selecting the same combo twice merges a rule by `(kind, value)` instead of stacking the same percentage again.

The combo cover file is stored under `AppData/images/` and referenced by `combo_cover_name` and `combo_cover_mime`. Component sale rows continue to use their own product covers.

## Current database boundary

Migrations 57 and 59 add:

- `combos`: stable ID, name, active state, optional cover reference, update/sync/delete bookkeeping.
- `combo_listings`: ordered listing references and positive integer quantities.
- `combo_discounts`: ordered discount rules hanging off a `combo_listings` row; the rupiah effect is derived, not stored.
- `combo_extras`: ordered references to the existing Extra catalog.

The child rows are part of the combo template. `combo_sync_at` is the dirty marker for the `combo` sync group: a service write bumps `combo_updated_at` and clears it, and the cycle pushes the whole aggregate (header plus all ordered child sets). The `tx_*` cart tables remain local-only.

## Sync (implemented)

Combos sync as catalogue master data, separately from transaction records and local carts. Committed sales already preserve the listing and Extra snapshots used at the time of selection; the template is never attached to the cart rows, so editing or deleting it cannot change a past receipt.

The `combo` group is its own independently synced unit (`SYNC-V2.md` §1.4, `docs/SYNC-V2-COMBO.md` on the server side):

1. A combo travels as one aggregate frame: the `combos` header plus the ordered `combo_listings`, `combo_discounts` and `combo_extras` children. Merge replaces the aggregate atomically, so a client never sees a new header with an old or partial component list.
2. `combo_id` is the stable aggregate identity; `combo_updated_at` is the LWW clock and `combo_deleted_at` is the soft-delete tombstone. Child edits bump the parent clock and clear `combo_sync_at`; the service writes both in one transaction.
3. `listing_id` and `extra_id` are opaque cross-group references. Migration 58 removes the local foreign keys, so a combo page can arrive before the product or extra page that supplies its references. POS only offers a combo whose components and presets resolve to currently usable rows, and never silently drops one during expansion.
4. `tx_records`, `tx_listings`, `tx_extras` and the other `tx_*` tables stay out of the group. They are unsynced working state, and committed records continue through the existing record aggregate with frozen values.

Cover **bytes** are not part of this group yet: the row carries `combo_cover_name`/`combo_cover_mime`, and the file lives under `AppData/images/`. Extending the product image-blob channel to combo covers is a follow-up. A device that has not received the file shows its placeholder.

Rollout has no backfill: set the `combo` bookmark to 0, mark every `combos` row dirty, and let the next cycle push them. `Sinkronisasi Ulang` does this for every group in one action.
