import type { ProductInput } from "~/services/product";

/**
 * The value checks a product has to pass before it may be written.
 *
 * Both ways in go through this: the Product form (`product.add`) and the
 * Settings → Data JSON import, which used to validate the *shape* of the file
 * only. A hand-edited export with `"price": -10000` or
 * `"stocks": [{ "value": -50, "capital": -900 }]` was accepted and written
 * straight into `listings`/`stocks`: the catalogue then showed a negative price
 * that `transaction.submit` refused at `Bayar` with no pointer back to the row,
 * and a negative cost basis silently poisoned `product.capital` and the
 * performance margin. The record import was hardened the same way
 * (`services/record/validate-line.ts`); this is its product twin.
 *
 * Kept pure and free of Effect so the boundary (the Zod schema in
 * `pages/Setting/Data/ProductUpload`) and the service agree by construction.
 * A zero price is allowed — freebies and give-aways are real — but nothing may
 * be negative.
 */

/** What a row is called in a message; a form row may not have a name yet. */
function label(name: string, fallback: string): string {
  return name.trim() === "" ? fallback : name.trim();
}

/** `null` when the product is sound, otherwise the cashier-facing reason. */
export function validateProductInput(input: ProductInput): string | null {
  const product = label(input.name, "produk");
  if (input.name.trim() === "") {
    return "Nama produk harus diisi";
  }
  if (input.listings.length === 0) {
    return `Produk ${product} butuh minimal satu listing`;
  }
  if (input.stocks.length === 0) {
    return `Produk ${product} butuh minimal satu stok`;
  }

  // A code identifies one listing; two rows sharing one is a lookup that can
  // never be resolved, so it is refused before the write rather than by the
  // database's unique index half way through the transaction.
  const codes = new Set<string>();
  for (const listing of input.listings) {
    const row = label(listing.name, product);
    if (listing.name.trim() === "") {
      return `Nama listing ${product} harus diisi`;
    }
    if (listing.kind.trim() === "") {
      return `Jenis listing ${row} harus diisi`;
    }
    if (!Number.isFinite(listing.price) || listing.price < 0) {
      return `Harga ${row} tidak valid`;
    }
    if (!Number.isInteger(listing.unit) || listing.unit < 1) {
      return `Satuan ${row} tidak valid`;
    }
    const code = listing.code?.trim() ?? "";
    if (code !== "") {
      if (codes.has(code)) {
        return `Kode ${code} dipakai dua kali di ${product}`;
      }
      codes.add(code);
      if (listing.codeKind !== "barcode" && listing.codeKind !== "qr") {
        return `Jenis kode ${code} tidak valid`;
      }
    }
  }

  for (const stock of input.stocks) {
    // A new product's opening stock is a count: a negative one is a typo, not
    // a shortage lot (those arrive later as an adjustment).
    if (!Number.isFinite(stock.value) || stock.value < 0) {
      return `Stok ${product} tidak valid`;
    }
    if (!Number.isFinite(stock.capital) || stock.capital < 0) {
      return `Modal ${product} tidak valid`;
    }
  }

  return null;
}
