# Flags

Five bitfields say what a stored row _is_. They live in different tables and
must not be confused: `records.record_flag` describes **history**, `tx_record_flag`
describes **working state** that disappears when the cart is committed,
`product_flag` says whether a **catalogue row** is on offer, and the two extras
flags (`extras.extra_flag` / `tx_extra_flag` / `record_extra_flag`) say what a
**charge** does — the same meaning carried through the catalogue, the cart and
the record, in that order.

A new meaning gets a new power of two and a name in the constants next to its
service; never reuse a bit. When a bit is added or changed, update this file and
the constant's doc comment in the same edit.

## `records.record_flag` — saved records

Defined in `src/services/record/index.ts`.

| bit | value   | constant                 | meaning                                                                                                                                                                                                         |
| --- | ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `0b001` | `RECORD_FLAG_ADJUSTMENT` | A hand-typed arbitrary transaction, written by the `/transaction` screen, **or** the extras-only twin a sale's `dual` charge commits. Its only lines are `record_extras`; it has no `record_listings`, moves no stock and belongs to no buyer or supplier. |
| —   | `0b000` | —                        | A real sale (`incoming`) or purchase (`outcoming`) rung up through the cart.                                                                                                                                    |

Reads that assume "a record sold or bought goods" must skip bit 0, e.g.
`WHERE record_flag & 1 = 0` for stock/profit reporting.

TODO: the record list (`/records`) does not filter yet, so a `dual` charge's twin
shows there as a goods-less `outcoming` row. Filtering bit 0 out of that list is
the open piece of work; it was deliberately left alone when the twin shipped so
the list keeps showing what is actually in the table until someone decides how
the pair should read (two rows, one row with a badge, or the twin hidden).

## `tx_records.tx_record_flag` — open carts

Defined in `src/services/transaction/index.ts`. These rows are transient: a
committed cart is deleted, so the bits are never archival.

| bit | value  | constant               | meaning                                                                                                                                                                                                             |
| --- | ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `0b01` | `STORED_FLAG`          | A parked cart: it leaves the active tab strip but stays in the list.                                                                                                                                                |
| 1   | `0b10` | `ADJUSTMENT_CART_FLAG` | An arbitrary-transaction tab (the `/transaction` screen). Its lines are flat `number` extras, and it is committed by `record.add.adjustment` — never by `transaction.submit`. It carries no listings and no images. |

Combinations:

| flag   | tab                                                   |
| ------ | ----------------------------------------------------- |
| `0b00` | an active sale or purchase cart                       |
| `0b01` | a parked sale or purchase cart                        |
| `0b10` | an active arbitrary-transaction tab                   |
| `0b11` | a parked arbitrary-transaction tab (not produced yet) |

## `extras.extra_flag` / `tx_extra_flag` / `record_extra_flag` — charges

One meaning, three snapshots. Defined as `DUAL_FLAG` in `src/lib/constants.ts`
(the catalogue side) and copied through the cart and the record so the answer
never depends on a catalogue row that may be renamed or deleted later.

| bit | value | constant    | meaning                                                                                                                                                                   |
| --- | ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `0b1` | `DUAL_FLAG` | The charge books twice. A sale carrying it also commits an extras-only `outcoming` record for the same money, in the same transaction, linked through `record_pair_id`. |
| —   | `0b0` | —           | An ordinary charge: it appears on the sale and nowhere else.                                                                                                              |

Where each copy lives:

| column                 | table           | written by                                                       |
| ---------------------- | --------------- | ---------------------------------------------------------------- |
| `extra_flag`           | `extras`        | the Extra form's `Dual` checkbox (`withDual` masks bit 0 only)    |
| `tx_extra_flag`        | `tx_extras`     | `z-Extras`' `addPreset`, copied from the picked preset            |
| `record_extra_flag`    | `record_extras` | `record.add.draft`, copied from the cart at submit               |

The copies exist for the same reason: a cart has no id link to the catalogue, so
the flag has to travel with the row. `tx_extra_flag` is what survives a
park/restore; `record_extra_flag` is what `unsubmit` rebuilds the cart from, so
an undone sale re-commits the same twin instead of silently losing it.

A twin is only ever written for a **sale** (`incoming`). On a purchase the dual
charge already sits on the outcoming side, so mirroring it would double-book it.
When the dual extras do not add up to a positive amount the twin is dropped and
the sale is kept: no record may be stored with a total of zero or less.

## `records.record_pair_id` — the twin link

Not a bitfield, but it belongs here because it answers the same question: a
`dual` charge produces two records that are only meaningful together.

`submit` writes the extras-only `outcoming` twin and stamps **both** rows with
the other's id — in the same SQL transaction, so one half can never land without
the other. `record.delete.byId` soft-deletes the twin along with its sale, which
is what keeps `Batalkan` from leaving a stray expense behind. NULL for every
ordinary record, and `ON DELETE SET NULL`, so a twin removed by any other path
cannot leave a dangling reference.

## `products.product_flag` — the catalogue

Defined in `src/services/product/index.ts`. Bit 0 is the only meaning so far:

| bit | value | constant                   | meaning                                                                                                                                                                                    |
| --- | ----- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | `0b1` | `PRODUCT_FLAG_UNPUBLISHED` | Withdrawn from the till. `ListingService` — the projection Pos and Restock both read — leaves the product and all of its listings out of its catalogue, so search, the grid and a scanned barcode all stop offering it. |
| —   | `0b0` | —                          | Published: the product is sellable and buyable.                                                                                                                                            |

Withdrawing is not deleting. The row, its stock, its images, its history,
`/products` and every old record still carry it — only the two cart screens stop
offering it. The switch is `product.set.publish(id, published)`, which masks bit 0
and preserves the rest, and saves immediately rather than with the form's
`Simpan`. Because `/products` is then the only place the state is still visible,
that list greys the row or card out and tags it "Tidak terbit" — grey, never red:
red is the loss badge, and a parked row is not a problem row.

Writers of `products.product_flag` must mask like the rest of this file:

```ts
const sellable = isPublished(product); // (product.flag & PRODUCT_FLAG_UNPUBLISHED) === 0
```

## Filtering

Each screen owns its slice by masking, never by equality:

```ts
const isAdjustmentTab = (draft: Draft) => (draft.flag & ADJUSTMENT_CART_FLAG) !== 0;
```

That keeps a stored adjustment tab (`0b11`) visible to `/transaction` if parking
is ever added there, instead of silently dropping it.
