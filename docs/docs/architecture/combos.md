---
sidebar_position: 12
---

# Combo templates

## Current implementation

A combo is catalogue master data, not a listing and not a transaction line. It has an ordered set of listing references with a quantity per component, an ordered set of references to existing `extras` presets, an active flag, and an optional cover image. `ComboService` owns `combos`, `combo_listings`, and `combo_extras`.

The authenticated `/combos` page is admin-only. Active combos with available component listings and Extra presets are searchable from the POS listing search. Selecting one copies the current listing values (name, code, unit, price, product and cover) into ordinary `tx_listings` rows and copies the current Extra values into ordinary `tx_extras` rows. Repeated component listings merge into the matching cart line like a regular listing selection. The combo template is not attached to the resulting cart rows.

**Combo Extras retain the existing transaction-wide behavior.** A negative value is a discount and applies across the whole cart, including items unrelated to the combo. Removing a component does not remove its Extra. Each selection appends the referenced Extra again. Once expanded, the cart and the eventual record contain ordinary listing and Extra snapshots; editing or deleting the template does not change them.

The combo cover file is stored under `AppData/images/` and referenced by `combo_cover_name` and `combo_cover_mime`. Component sale rows continue to use their own product covers.

## Current database boundary

Migration 57 adds:

- `combos`: stable ID, name, active state, optional cover reference, update/sync/delete bookkeeping.
- `combo_listings`: ordered listing references and positive integer quantities.
- `combo_extras`: ordered references to the existing Extra catalog.

The child rows are part of the combo template. `combo_sync_at` is reserved for a future sync implementation; current service writes do not register or run a sync group. The `tx_*` cart tables remain local-only.

## Future sync design (not implemented)

Combos should sync as catalogue master data, separately from transaction records and local carts. Do not add combo provenance to transaction history merely to sync the template: committed sales already preserve the listing and Extra snapshots used at the time of selection.

A future protocol change should:

1. Add a dedicated `combo` group (or an explicit versioned addition to the catalog protocol) with its own bookmark and endpoint contract. Coordinate the client and server rollout; this feature currently has no wire representation.
2. Send a combo as one logical parent aggregate: the header plus the ordered `combo_listings` and `combo_extras` children. Pull merge should replace that aggregate atomically, so a client cannot see a new header with an old or partial component list. Child ordering and quantities are business data, not incidental row order.
3. Use `combo_id` as the stable aggregate identity; include `combo_updated_at` and `combo_deleted_at` in the wire contract. Child edits must bump the parent clock and clear its sync marker. Deletion must upload a tombstone rather than physically removing the parent. Define and test conflict resolution and clock guards against the active SYNC-V2 contract before shipping.
4. Treat `listing_id` and `extra_id` as opaque cross-group references. The product and extra groups may arrive later or contain a tombstoned/unavailable row. The pull must still store the combo aggregate without failing a page; POS should only offer a combo after all its references resolve to currently usable catalog rows. Never silently drop one component or preset during expansion.
5. Extend the image-byte protocol for combo covers. A cover needs a stable blob identity, version/dirty marker, digest and MIME in the manifest; uploads and downloads must use the same verified file-write lifecycle as product images. Decide whether to retain the current one-cover columns or migrate to a `combo_images` child table before defining the wire schema. Removing/replacing a cover must make the old blob collectible without invalidating a still-referenced file.
6. Keep `tx_records`, `tx_listings`, `tx_extras`, and other `tx_*` tables out of the combo sync group. They are unsynced working state, and committed records continue through the existing record aggregate with frozen values.

Before implementing sync, update the client schema, frames, SQL/merge paths, group order and blob manifest; add the server contract and server storage/merge support; update `SYNC-V2.md`, migration checksums and sync tests; then verify two offline devices with concurrent edits, deletion, missing references, and cover replacement. None of those sync code changes are part of migration 57.
