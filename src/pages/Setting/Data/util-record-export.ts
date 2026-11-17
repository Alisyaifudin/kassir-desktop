import type { RecordFull, RecordImport } from "~/services/record";

/** A record as the upload accepts it: the same shape `record.add.external` takes. */
export function toRecordImport(record: RecordFull): RecordImport {
  return {
    paidAt: record.paidAt ?? record.creditAt ?? record.createdAt,
    rounding: record.rounding,
    isCredit: record.isCredit,
    cashier: record.cashier,
    mode: record.mode,
    pay: record.pay,
    note: record.note,
    fix: record.fix,
    customer: { name: record.customer.name, phone: record.customer.phone },
    supplier: { id: record.supplier.id, name: record.supplier.name },
    subTotal: record.subTotal,
    total: record.total,
    methods: record.methods.map(({ methodId, pay }) => ({ methodId, pay })),
    listings: record.listings.map(
      ({ name, kind, price, qty, capital, total, discounts, portions }) => ({
        // The line no longer carries a catalog listing id; the per-lot portions
        // and their journal rows are what an import restores instead.
        listingId: null,
        name,
        kind,
        price,
        qty,
        capital,
        total,
        discounts: discounts.map(({ kind, value, eff }) => ({ kind, value, eff })),
        // One entry per lot, each with the movement it wrote. The writer appends
        // those events and re-folds the lots from them, so a download is a
        // restorable backup and not only a record listing.
        portions: portions.map(({ unit, qty, capital, total, productId, stockId, event }) => ({
          unit,
          qty,
          capital,
          total,
          // A portion with no event moved no stock. The event names its own
          // product and lot, so the portion does not repeat them.
          event:
            event === null || productId === null
              ? null
              : {
                  id: event.id,
                  createdAt: event.createdAt,
                  value: event.value,
                  capital: event.capital,
                  note: event.note,
                  productId,
                  stockId,
                },
        })),
      }),
    ),
    extras: record.extras.map(({ name, value, eff, kind }) => ({ name, value, eff, kind })),
  };
}
