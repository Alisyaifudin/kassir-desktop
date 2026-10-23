# Flags

Three bitfields say what a stored row _is_. They live in different tables and
must not be confused: `records.record_flag` describes **history**, `tx_record_flag`
describes **working state** that disappears when the cart is committed, and
`product_flag` says whether a **catalogue row** is on offer.

A new meaning gets a new power of two and a name in the constants next to its
service; never reuse a bit. When a bit is added or changed, update this file and
the constant's doc comment in the same edit.

## `records.record_flag` — saved records

Defined in `src/services/record/index.ts`.

| bit | value   | constant                 | meaning                                                                                                                                                                                                         |
| --- | ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `0b001` | `RECORD_FLAG_ADJUSTMENT` | A hand-typed arbitrary transaction, written by the `/transaction` screen. Its only lines are `record_extras` of kind `number`; it has no `record_listings`, moves no stock and belongs to no buyer or supplier. |
| —   | `0b000` | —                        | A real sale (`incoming`) or purchase (`outcoming`) rung up through the cart.                                                                                                                                    |

Reads that assume "a record sold or bought goods" must skip bit 0, e.g.
`WHERE record_flag & 1 = 0` for stock/profit reporting. The record list
(`/records`) does not filter yet — that is the open TODO.

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
