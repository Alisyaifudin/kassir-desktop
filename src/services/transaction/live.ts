import { Effect, Either, Layer, Stream, SubscriptionRef } from "effect";
import Decimal from "decimal.js";
import {
  STORED_FLAG,
  SubmitError,
  TransactionError,
  TransactionService,
  type Draft,
  type DraftExtra,
  type DraftImage,
  type DraftImageMime,
  type DraftListing,
  type DraftMethod,
  type DraftMode,
} from ".";
import { DatabaseService, type DbError, type Statement } from "../db";
import { RecordService, type RecordDraftInput, type RecordFull, type RecordMirrorInput } from "../record";
import {
  discountsEatLine,
  linesSubtotal,
  paidTotal,
  recalcDiscounts,
  recalcExtras,
  roundMoney,
  transactionGrandTotal,
} from "~/lib/purchase";
import { NotFound } from "~/lib/effect-error";
import { generateId } from "~/lib/random";
import { image } from "~/lib/image";
import { DEBOUNCE_DELAY, DUAL_FLAG, METHOD_BASE_ID } from "~/lib/constants";
import { log } from "~/lib/log";

/** The same limits the product gallery enforces. */
const MAX_IMAGE_SIZE = 10 * 1e6;

function imageMimeOf(type: string): DraftImageMime | null {
  if (type === "image/png" || type === "image/jpeg" || type === "image/webp") return type;
  return null;
}

type RecordRow = {
  tx_record_id: string;
  tx_record_order: number;
  tx_record_flag: number;
  tx_record_title: string;
  tx_record_mode: DraftMode;
  tx_record_fix: number;
  tx_record_note: string;
  tx_record_rounding: number;
  tx_record_customer_id: string | null;
  tx_record_customer_name: string;
  tx_record_customer_phone: string;
  tx_record_supplier_id: string | null;
  tx_record_supplier_name: string;
};

type MethodRow = {
  tx_method_id: string;
  tx_record_id: string;
  method_id: string;
  tx_method_value: number;
};

type ImageRow = {
  tx_image_id: string;
  tx_record_id: string;
  tx_image_order: number;
  tx_image_name: string;
  tx_image_mime: DraftImageMime;
};

type ListingRow = {
  tx_listing_id: string;
  tx_record_id: string;
  listing_id: string | null;
  tx_listing_name: string;
  tx_listing_code: string;
  tx_listing_kind: string;
  tx_listing_price: number;
  tx_listing_unit: number;
  tx_listing_qty: number;
};

type DiscountRow = {
  tx_disc_id: string;
  tx_listing_id: string;
  tx_disc_value: number;
  tx_disc_eff: number;
  tx_disc_kind: "number" | "percent" | "pcs";
};

type ExtraRow = {
  tx_extra_id: string;
  tx_record_id: string;
  tx_extra_kind: "number" | "percent";
  tx_extra_name: string;
  tx_extra_value: number;
  tx_extra_flag: number;
};

const SELECT_RECORDS = `
  SELECT tx_record_id, tx_record_order, tx_record_flag, tx_record_title,
         tx_record_mode, tx_record_fix, tx_record_note, tx_record_rounding,
         tx_record_customer_id, tx_record_customer_name, tx_record_customer_phone,
         tx_record_supplier_id, tx_record_supplier_name
  FROM tx_records
  ORDER BY tx_record_order`;

const SELECT_METHODS = `
  SELECT tx_method_id, tx_record_id, method_id, tx_method_value
  FROM tx_methods`;

const SELECT_IMAGES = `
  SELECT tx_image_id, tx_record_id, tx_image_order, tx_image_name, tx_image_mime
  FROM tx_images
  ORDER BY tx_image_order`;

const SELECT_LISTINGS = `
  SELECT tx_listing_id, tx_record_id, listing_id, tx_listing_name, tx_listing_code,
         tx_listing_kind, tx_listing_price, tx_listing_unit, tx_listing_qty
  FROM tx_listings
  ORDER BY rowid`;

const SELECT_DISCOUNTS = `
  SELECT tx_disc_id, tx_listing_id, tx_disc_value, tx_disc_eff, tx_disc_kind
  FROM tx_discounts
  ORDER BY tx_disc_order`;

const SELECT_EXTRAS = `
  SELECT tx_extra_id, tx_record_id, tx_extra_kind, tx_extra_name, tx_extra_value,
         tx_extra_flag
  FROM tx_extras
  ORDER BY tx_extra_order`;

function toError(error: DbError): TransactionError {
  return new TransactionError({ message: error.message });
}

function rowToDraft(
  row: RecordRow,
  methods: DraftMethod[],
  images: DraftImage[],
  listings: DraftListing[],
  extras: DraftExtra[],
): Draft {
  return {
    id: row.tx_record_id,
    order: row.tx_record_order,
    flag: row.tx_record_flag,
    title: row.tx_record_title,
    mode: row.tx_record_mode,
    fix: row.tx_record_fix,
    note: row.tx_record_note,
    rounding: row.tx_record_rounding,
    customerId: row.tx_record_customer_id,
    customerName: row.tx_record_customer_name,
    customerPhone: row.tx_record_customer_phone,
    supplierId: row.tx_record_supplier_id,
    supplierName: row.tx_record_supplier_name,
    listings,
    extras,
    methods,
    images,
  };
}

/** The draft's own row, upserted so a fresh draft and an edit share one shape. */
function recordStatement(draft: Draft): Statement {
  return {
    sql: `INSERT INTO tx_records (
        tx_record_id, tx_record_order, tx_record_flag, tx_record_title,
        tx_record_mode, tx_record_query, tx_record_fix, tx_record_note,
        tx_record_rounding, tx_record_customer_id, tx_record_customer_name,
        tx_record_customer_phone, tx_record_supplier_id, tx_record_supplier_name
      ) VALUES ($1, $2, $3, $4, $5, '', $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT(tx_record_id) DO UPDATE SET
        tx_record_order = excluded.tx_record_order,
        tx_record_flag = excluded.tx_record_flag,
        tx_record_title = excluded.tx_record_title,
        tx_record_mode = excluded.tx_record_mode,
        tx_record_fix = excluded.tx_record_fix,
        tx_record_note = excluded.tx_record_note,
        tx_record_rounding = excluded.tx_record_rounding,
        tx_record_customer_id = excluded.tx_record_customer_id,
        tx_record_customer_name = excluded.tx_record_customer_name,
        tx_record_customer_phone = excluded.tx_record_customer_phone,
        tx_record_supplier_id = excluded.tx_record_supplier_id,
        tx_record_supplier_name = excluded.tx_record_supplier_name`,
    bindings: [
      draft.id,
      draft.order,
      draft.flag,
      draft.title,
      draft.mode,
      draft.fix,
      draft.note,
      draft.rounding,
      draft.customerId,
      draft.customerName,
      draft.customerPhone,
      draft.supplierId,
      draft.supplierName,
    ],
  };
}

function insertListingStatement(draftId: string, listing: DraftListing): Statement {
  return {
    sql: `INSERT INTO tx_listings (
        tx_listing_id, tx_record_id, listing_id, tx_listing_name, tx_listing_code,
        tx_listing_price, tx_listing_unit, tx_listing_qty, tx_listing_kind
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    bindings: [
      listing.id,
      draftId,
      listing.listingId ?? null,
      listing.name,
      listing.code,
      listing.price,
      listing.unit,
      listing.qty,
      listing.kind ?? "",
    ],
  };
}

function updateListingStatement(listing: DraftListing): Statement {
  return {
    sql: `UPDATE tx_listings SET
        listing_id = $2, tx_listing_name = $3, tx_listing_code = $4,
        tx_listing_kind = $5, tx_listing_price = $6, tx_listing_unit = $7,
        tx_listing_qty = $8
      WHERE tx_listing_id = $1`,
    bindings: [
      listing.id,
      listing.listingId ?? null,
      listing.name,
      listing.code,
      listing.kind ?? "",
      listing.price,
      listing.unit,
      listing.qty,
    ],
  };
}

const DELETE_LISTING: (id: string) => Statement = (id) => ({
  sql: `DELETE FROM tx_listings WHERE tx_listing_id = $1`,
  bindings: [id],
});

function insertDiscountStatement(
  listingId: string,
  discount: DraftListing["discounts"][number],
): Statement {
  return {
    sql: `INSERT INTO tx_discounts (
        tx_disc_id, tx_listing_id, tx_disc_value, tx_disc_eff, tx_disc_kind
      ) VALUES ($1, $2, $3, $4, $5)`,
    bindings: [discount.id, listingId, discount.value, discount.eff, discount.kind],
  };
}

function insertExtraStatement(draftId: string, extra: DraftExtra): Statement {
  return {
    sql: `INSERT INTO tx_extras (
        tx_extra_id, tx_record_id, tx_extra_kind, tx_extra_name, tx_extra_value,
        tx_extra_eff, tx_extra_flag
      ) VALUES ($1, $2, $3, $4, $5, 0, $6)`,
    bindings: [extra.id, draftId, extra.kind, extra.name, extra.value, extra.flag],
  };
}

function updateExtraStatement(extra: DraftExtra): Statement {
  return {
    sql: `UPDATE tx_extras SET
        tx_extra_kind = $2, tx_extra_name = $3, tx_extra_value = $4, tx_extra_flag = $5
      WHERE tx_extra_id = $1`,
    bindings: [extra.id, extra.kind, extra.name, extra.value, extra.flag],
  };
}

function insertMethodStatement(draftId: string, method: DraftMethod): Statement {
  return {
    sql: `INSERT INTO tx_methods (tx_method_id, tx_record_id, method_id, tx_method_value)
          VALUES ($1, $2, $3, $4)`,
    bindings: [method.id, draftId, method.methodId, method.value],
  };
}

function updateMethodStatement(method: DraftMethod): Statement {
  return {
    sql: `UPDATE tx_methods SET method_id = $2, tx_method_value = $3 WHERE tx_method_id = $1`,
    bindings: [method.id, method.methodId, method.value],
  };
}

function insertImageStatement(draftId: string, img: DraftImage): Statement {
  return {
    sql: `INSERT INTO tx_images (tx_image_id, tx_image_order, tx_image_name, tx_image_mime, tx_record_id)
          VALUES ($1, $2, $3, $4, $5)`,
    bindings: [img.id, img.order, img.name, img.mime, draftId],
  };
}

function updateImageStatement(img: DraftImage): Statement {
  return {
    sql: `UPDATE tx_images SET tx_image_order = $2, tx_image_name = $3, tx_image_mime = $4
           WHERE tx_image_id = $1`,
    bindings: [img.id, img.order, img.name, img.mime],
  };
}

/**
 * The draft row plus every child row, as one atomic rewrite. Used when the whole
 * aggregate is new: `add.new` and `unsubmit`. Edits use {@link statementsForChange}.
 */
function statementsFor(draft: Draft): Statement[] {
  return [
    recordStatement(draft),
    { sql: `DELETE FROM tx_listings WHERE tx_record_id = $1`, bindings: [draft.id] },
    ...draft.listings.map((listing) => insertListingStatement(draft.id, listing)),
    ...draft.listings.flatMap((listing) =>
      listing.discounts.map((discount) => insertDiscountStatement(listing.id, discount)),
    ),
    { sql: `DELETE FROM tx_extras WHERE tx_record_id = $1`, bindings: [draft.id] },
    ...draft.extras.map((extra) => insertExtraStatement(draft.id, extra)),
    { sql: `DELETE FROM tx_methods WHERE tx_record_id = $1`, bindings: [draft.id] },
    ...draft.methods.map((method) => insertMethodStatement(draft.id, method)),
    { sql: `DELETE FROM tx_images WHERE tx_record_id = $1`, bindings: [draft.id] },
    ...draft.images.map((img) => insertImageStatement(draft.id, img)),
  ];
}

function sameRecordRow(previous: Draft, draft: Draft): boolean {
  return (
    previous.order === draft.order &&
    previous.flag === draft.flag &&
    previous.title === draft.title &&
    previous.mode === draft.mode &&
    previous.fix === draft.fix &&
    previous.note === draft.note &&
    previous.rounding === draft.rounding &&
    previous.customerId === draft.customerId &&
    previous.customerName === draft.customerName &&
    previous.customerPhone === draft.customerPhone &&
    previous.supplierId === draft.supplierId &&
    previous.supplierName === draft.supplierName
  );
}

function sameListingRow(previous: DraftListing, listing: DraftListing): boolean {
  return (
    (previous.listingId ?? null) === (listing.listingId ?? null) &&
    previous.name === listing.name &&
    previous.code === listing.code &&
    (previous.kind ?? "") === (listing.kind ?? "") &&
    previous.unit === listing.unit &&
    previous.price === listing.price &&
    previous.qty === listing.qty
  );
}

function sameDiscounts(
  previous: DraftListing["discounts"],
  next: DraftListing["discounts"],
): boolean {
  if (previous.length !== next.length) return false;
  return previous.every((discount, index) => {
    const other = next[index];
    return (
      discount.id === other.id &&
      discount.value === other.value &&
      discount.eff === other.eff &&
      discount.kind === other.kind
    );
  });
}

function sameExtra(previous: DraftExtra, extra: DraftExtra): boolean {
  return (
    previous.kind === extra.kind && previous.name === extra.name && previous.value === extra.value
  );
}

function sameMethod(previous: DraftMethod, method: DraftMethod): boolean {
  return previous.methodId === method.methodId && previous.value === method.value;
}

function sameImage(previous: DraftImage, img: DraftImage): boolean {
  return previous.order === img.order && previous.name === img.name && previous.mime === img.mime;
}

/**
 * Only what actually changed since the last successful write. One qty edit is one
 * `UPDATE`; the alternative (`statementsFor`) is ~2 statements per line plus 1 per
 * discount on every keystroke, all through the single SQLite connection the rest
 * of the app is using.
 */
function statementsForChange(previous: Draft | undefined, draft: Draft): Statement[] {
  if (previous === undefined) return statementsFor(draft);

  const statements: Statement[] = [];
  if (!sameRecordRow(previous, draft)) statements.push(recordStatement(draft));

  const previousListings = new Map(previous.listings.map((line) => [line.id, line]));
  const nextIds = new Set(draft.listings.map((line) => line.id));
  for (const line of previous.listings) {
    if (!nextIds.has(line.id)) statements.push(DELETE_LISTING(line.id));
  }
  for (const line of draft.listings) {
    const before = previousListings.get(line.id);
    if (before === undefined) {
      statements.push(insertListingStatement(draft.id, line));
      for (const discount of line.discounts) {
        statements.push(insertDiscountStatement(line.id, discount));
      }
      continue;
    }
    if (!sameListingRow(before, line)) statements.push(updateListingStatement(line));
    if (!sameDiscounts(before.discounts, line.discounts)) {
      statements.push({
        sql: `DELETE FROM tx_discounts WHERE tx_listing_id = $1`,
        bindings: [line.id],
      });
      for (const discount of line.discounts) {
        statements.push(insertDiscountStatement(line.id, discount));
      }
    }
  }

  const previousExtras = new Map(previous.extras.map((extra) => [extra.id, extra]));
  const nextExtras = new Set(draft.extras.map((extra) => extra.id));
  for (const extra of previous.extras) {
    if (!nextExtras.has(extra.id)) {
      statements.push({
        sql: `DELETE FROM tx_extras WHERE tx_extra_id = $1`,
        bindings: [extra.id],
      });
    }
  }
  for (const extra of draft.extras) {
    const before = previousExtras.get(extra.id);
    if (before === undefined) statements.push(insertExtraStatement(draft.id, extra));
    else if (!sameExtra(before, extra)) statements.push(updateExtraStatement(extra));
  }

  const previousMethods = new Map(previous.methods.map((method) => [method.id, method]));
  const nextMethods = new Set(draft.methods.map((method) => method.id));
  for (const method of previous.methods) {
    if (!nextMethods.has(method.id)) {
      statements.push({
        sql: `DELETE FROM tx_methods WHERE tx_method_id = $1`,
        bindings: [method.id],
      });
    }
  }
  for (const method of draft.methods) {
    const before = previousMethods.get(method.id);
    if (before === undefined) statements.push(insertMethodStatement(draft.id, method));
    else if (!sameMethod(before, method)) statements.push(updateMethodStatement(method));
  }

  const previousImages = new Map(previous.images.map((img) => [img.id, img]));
  const nextImages = new Set(draft.images.map((img) => img.id));
  for (const img of previous.images) {
    if (!nextImages.has(img.id)) {
      statements.push({
        sql: `DELETE FROM tx_images WHERE tx_image_id = $1`,
        bindings: [img.id],
      });
    }
  }
  for (const img of draft.images) {
    const before = previousImages.get(img.id);
    if (before === undefined) statements.push(insertImageStatement(draft.id, img));
    else if (!sameImage(before, img)) statements.push(updateImageStatement(img));
  }

  return statements;
}

/** The tab position a draft appended now takes: after every open one. */
function nextOrder(drafts: Draft[]): number {
  return drafts.reduce((max, draft) => Math.max(max, draft.order), -1) + 1;
}

export const TransactionLive = Layer.effect(
  TransactionService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const record = yield* RecordService;

    // The live cart, seeded empty so layer construction stays synchronous. A
    // change updates the ref right away; the database write is coalesced below.
    const draftsRef = yield* SubscriptionRef.make<Draft[]>([]);
    let loaded = false;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    // The last version of each draft that is known to be on disk, so a flush can
    // write only what changed (see `statementsForChange`).
    const written = new Map<string, Draft>();
    // `null` while the cart on screen is also the cart on disk. A failed write
    // sets a message the POS renders, because a cart that looks saved but is not
    // is the one failure a cashier must not discover by crashing.
    const saveErrorRef = yield* SubscriptionRef.make<string | null>(null);

    function load(): Effect.Effect<Draft[], TransactionError> {
      return Effect.gen(function* () {
        const records = yield* db
          .selectMany<RecordRow>(SELECT_RECORDS)
          .pipe(Effect.mapError(toError));
        const methodRows = yield* db
          .selectMany<MethodRow>(SELECT_METHODS)
          .pipe(Effect.mapError(toError));
        const imageRows = yield* db
          .selectMany<ImageRow>(SELECT_IMAGES)
          .pipe(Effect.mapError(toError));
        const listingRows = yield* db
          .selectMany<ListingRow>(SELECT_LISTINGS)
          .pipe(Effect.mapError(toError));
        const discountRows = yield* db
          .selectMany<DiscountRow>(SELECT_DISCOUNTS)
          .pipe(Effect.mapError(toError));
        const extraRows = yield* db
          .selectMany<ExtraRow>(SELECT_EXTRAS)
          .pipe(Effect.mapError(toError));

        const byRecord = new Map<string, DraftMethod[]>();
        for (const row of methodRows) {
          const list = byRecord.get(row.tx_record_id) ?? [];
          list.push({ id: row.tx_method_id, methodId: row.method_id, value: row.tx_method_value });
          byRecord.set(row.tx_record_id, list);
        }
        const imagesByRecord = new Map<string, DraftImage[]>();
        for (const row of imageRows) {
          const list = imagesByRecord.get(row.tx_record_id) ?? [];
          list.push({
            id: row.tx_image_id,
            order: row.tx_image_order,
            name: row.tx_image_name,
            mime: row.tx_image_mime,
          });
          imagesByRecord.set(row.tx_record_id, list);
        }

        const discountsByListing = new Map<string, DiscountRow[]>();
        for (const row of discountRows) {
          const list = discountsByListing.get(row.tx_listing_id) ?? [];
          list.push(row);
          discountsByListing.set(row.tx_listing_id, list);
        }
        const listingsByRecord = new Map<string, DraftListing[]>();
        for (const row of listingRows) {
          let running = new Decimal(row.tx_listing_price).times(row.tx_listing_qty);
          const discounts = (discountsByListing.get(row.tx_listing_id) ?? []).map((discount) => {
            running = running.minus(discount.tx_disc_eff);
            return {
              id: discount.tx_disc_id,
              value: discount.tx_disc_value,
              kind: discount.tx_disc_kind,
              eff: discount.tx_disc_eff,
              total: running.toNumber(),
            };
          });
          const list = listingsByRecord.get(row.tx_record_id) ?? [];
          list.push({
            id: row.tx_listing_id,
            listingId: row.listing_id,
            name: row.tx_listing_name,
            code: row.tx_listing_code,
            kind: row.tx_listing_kind,
            unit: row.tx_listing_unit,
            price: row.tx_listing_price,
            qty: row.tx_listing_qty,
            discounts,
          });
          listingsByRecord.set(row.tx_record_id, list);
        }
        const extrasByRecord = new Map<string, DraftExtra[]>();
        for (const row of extraRows) {
          const list = extrasByRecord.get(row.tx_record_id) ?? [];
          list.push({
            id: row.tx_extra_id,
            name: row.tx_extra_name,
            kind: row.tx_extra_kind,
            value: row.tx_extra_value,
            flag: row.tx_extra_flag,
          });
          extrasByRecord.set(row.tx_record_id, list);
        }
        return records.map((row) =>
          rowToDraft(
            row,
            byRecord.get(row.tx_record_id) ?? [],
            imagesByRecord.get(row.tx_record_id) ?? [],
            listingsByRecord.get(row.tx_record_id) ?? [],
            extrasByRecord.get(row.tx_record_id) ?? [],
          ),
        );
      });
    }

    function hydrate(): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        const drafts = yield* load();
        for (const draft of drafts) written.set(draft.id, draft);
        yield* SubscriptionRef.set(draftsRef, drafts);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function readRecord(id: string): Effect.Effect<RecordFull, TransactionError> {
      return record.get
        .byId(id)
        .pipe(Effect.mapError((error) => new TransactionError({ message: error.message })));
    }

    /**
     * A saved record, rebuilt as an editable cart. Two conversions matter: the
     * record keeps pcs and a per-pc price while a draft line works in catalog
     * units, so each line is matched to its listing again (falling back to the
     * record's own numbers when the listing is gone); and every discount is run
     * through the cart's own math, because only the record knows what each one
     * took off.
     *
     * Every id is fresh. This backs `unsubmit` — where the record is then
     * deleted — and `add.fromRecord`, which may copy the same record more than
     * once, so reusing the record's own row ids would collide.
     */
    function draftFromRecord(
      saved: RecordFull,
      order: number,
    ): Effect.Effect<Draft, TransactionError> {
      return Effect.gen(function* () {
        const listings: DraftListing[] = [];
        for (const line of saved.listings) {
          let catalog: {
            listing_id: string;
            listing_code: string | null;
            listing_name: string;
            listing_kind: string;
            listing_price: number;
            listing_unit: number;
          } | null = null;
          if (line.productId !== null) {
            const rows = yield* db
              .selectMany<{
                listing_id: string;
                listing_code: string | null;
                listing_name: string;
                listing_kind: string;
                listing_price: number;
                listing_unit: number;
              }>(
                `SELECT listing_id, listing_code, listing_name, listing_kind, listing_price, listing_unit
                 FROM listings
                 WHERE product_id = $1
                   AND listing_deleted_at IS NULL
                   AND listing_unit = $2
                 ORDER BY abs(listing_price - $3) ASC, listing_updated_at DESC
                 LIMIT 1`,
                [line.productId, line.unit, line.price * line.unit],
              )
              .pipe(Effect.mapError(toError));
            catalog = rows[0] ?? null;
          }
          // The record's qty is in pcs and its price is per pc; the draft
          // works in listing units.
          const price = catalog?.listing_price ?? line.price * line.unit;
          const qty = line.unit > 0 ? Math.max(0, Math.round(line.qty / line.unit)) : line.qty;
          const discounts = recalcDiscounts(
            price,
            qty,
            line.discounts.map((discount) => ({
              id: generateId(),
              value: discount.value,
              kind: discount.kind,
              eff: 0,
              total: 0,
            })),
          );
          listings.push({
            id: generateId(),
            listingId: catalog?.listing_id ?? null,
            name: line.name,
            code: catalog?.listing_code ?? "",
            kind: catalog?.listing_kind ?? line.kind,
            unit: line.unit,
            price,
            qty,
            discounts,
            base:
              catalog === null
                ? undefined
                : {
                    name: catalog.listing_name,
                    code: catalog.listing_code ?? "",
                    unit: catalog.listing_unit,
                    price: catalog.listing_price,
                  },
          });
        }

        // Prefer the customer row that was written at submit; a customer that
        // has since been deleted falls back to the name/phone text.
        let customerId: string | null = null;
        if (saved.customer.name.trim() !== "") {
          const rows = yield* db
            .selectMany<{ customer_id: string }>(
              `SELECT customer_id FROM customers
               WHERE customer_deleted_at IS NULL AND lower(customer_name) = lower($1)
               ORDER BY customer_updated_at DESC LIMIT 1`,
              [saved.customer.name],
            )
            .pipe(Effect.mapError(toError));
          customerId = rows[0]?.customer_id ?? null;
        }

        const imageRows = yield* db
          .selectMany<{
            record_image_order: number;
            record_image_name: string;
            record_image_mime: DraftImageMime;
          }>(
            `SELECT record_image_order, record_image_name, record_image_mime
             FROM record_images WHERE record_id = $1 ORDER BY record_image_order`,
            [saved.id],
          )
          .pipe(Effect.mapError(toError));

        return {
          id: generateId(),
          order,
          flag: 0,
          title: listings.find((line) => line.name.trim() !== "")?.name.trim() ?? "Transaksi Baru",
          mode: saved.mode,
          fix: saved.fix,
          note: saved.note,
          customerId,
          customerName: customerId === null ? saved.customer.name : "",
          customerPhone: customerId === null ? saved.customer.phone : "",
          supplierId: saved.supplier.id,
          supplierName: saved.supplier.id === null ? saved.supplier.name : "",
          rounding: saved.rounding,
          listings,
          extras: saved.extras.map((extra) => ({
            id: generateId(),
            name: extra.name,
            kind: extra.kind,
            value: extra.value,
            // The catalogue snapshot the record carries, so a cart restored from
            // history re-commits the same twin instead of silently losing it.
            flag: extra.flag,
          })),
          methods: saved.methods.map((method) => ({
            id: generateId(),
            methodId: method.methodId,
            value: method.pay,
          })),
          images: imageRows.map((image) => ({
            id: generateId(),
            order: image.record_image_order,
            name: image.record_image_name,
            mime: image.record_image_mime,
          })),
        };
      });
    }

    /**
     * Puts a rebuilt draft on disk and in the ref. Written before anything else
     * happens to it, so a cart the cashier can see is also a cart that survives
     * a crash — and so the debounced writer treats it as already saved.
     */
    function persistDraft(draft: Draft): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        yield* db.transaction(statementsFor(draft)).pipe(Effect.mapError(toError));
        written.set(draft.id, draft);
        yield* SubscriptionRef.update(draftsRef, (list) => [...list, draft]);
      });
    }

    /**
     * Writes one draft's pending changes. Failures are recorded on
     * {@link saveErrorRef} and in the app log (`src/lib/log.ts`, the file Setting
     * > Log reads) rather than swallowed into the console.
     */
    function flush(id: string): Effect.Effect<void> {
      return Effect.gen(function* () {
        const drafts = yield* SubscriptionRef.get(draftsRef);
        const draft = drafts.find((d) => d.id === id);
        if (draft === undefined) return;
        const statements = statementsForChange(written.get(id), draft);
        if (statements.length === 0) return;
        yield* db.transaction(statements).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              written.set(id, draft);
            }),
          ),
          Effect.tap(() => SubscriptionRef.set(saveErrorRef, null)),
          Effect.catchAll((error) => {
            const message = `Keranjang belum tersimpan: ${error.message}`;
            log.error(message);
            return SubscriptionRef.set(saveErrorRef, message);
          }),
        );
      });
    }

    /** Write every draft now, instead of waiting out the debounce. */
    function flushAll(): Effect.Effect<void> {
      return Effect.gen(function* () {
        const drafts = yield* SubscriptionRef.get(draftsRef);
        yield* Effect.forEach(
          drafts,
          (draft) => {
            const timer = timers.get(draft.id);
            if (timer !== undefined) {
              clearTimeout(timer);
              timers.delete(draft.id);
            }
            return flush(draft.id);
          },
          { discard: true },
        );
      });
    }

    // Debounce per draft: the last edit wins and the write happens once the
    // operator pauses. Cleared on delete so a removed draft is never rewritten.
    function schedule(id: string) {
      const existing = timers.get(id);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          Effect.runFork(flush(id));
        }, DEBOUNCE_DELAY),
      );
    }

    function update(
      id: string,
      change: (draft: Draft) => Draft,
    ): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        yield* SubscriptionRef.update(draftsRef, (drafts) =>
          drafts.map((draft) => (draft.id === id ? change(draft) : draft)),
        );
        schedule(id);
      });
    }

    return {
      get: {
        drafts(mode) {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(draftsRef)),
            Effect.map((drafts) => drafts.filter((draft) => draft.mode === mode)),
          );
        },
        byId(id) {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(draftsRef)),
            Effect.flatMap((drafts) => {
              const draft = drafts.find((d) => d.id === id);
              return draft === undefined
                ? Effect.fail(new NotFound({ message: "Draft tidak ditemukan" }))
                : Effect.succeed(draft);
            }),
          );
        },
        // Hydrates on first subscribe, then replays the cart and every change.
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(draftsRef.changes))),
        saveError: saveErrorRef.changes,
      },
      flush: () =>
        ensureLoaded().pipe(
          Effect.zipRight(flushAll()),
          Effect.mapError((error) => new TransactionError({ message: error.message })),
        ),
      reportError(message) {
        return Effect.sync(() => {
          log.error(message);
        }).pipe(Effect.zipRight(SubscriptionRef.set(saveErrorRef, message)));
      },
      submit(id, input) {
        return Effect.gen(function* () {
          yield* ensureLoaded();
          const drafts = yield* SubscriptionRef.get(draftsRef);
          const draft = drafts.find((candidate) => candidate.id === id);
          if (draft === undefined) {
            return yield* Effect.fail(
              new SubmitError({ kind: "empty", message: "Transaksi tidak ditemukan" }),
            );
          }
          if ((draft.flag & STORED_FLAG) !== 0) {
            return yield* Effect.fail(
              new SubmitError({
                kind: "stored",
                message: "Transaksi tersimpan tidak bisa dibayar",
              }),
            );
          }
          const lines = draft.listings.filter((line) => line.qty > 0);
          if (lines.length === 0) {
            return yield* Effect.fail(
              new SubmitError({
                kind: "empty",
                message: "Transaksi harus punya minimal satu barang",
              }),
            );
          }
          for (const line of lines) {
            if (line.listingId === null && line.name.trim() === "") {
              return yield* Effect.fail(
                new SubmitError({ kind: "name", message: "Nama barang manual harus diisi" }),
              );
            }
            if (!Number.isInteger(line.unit) || line.unit < 1) {
              return yield* Effect.fail(
                new SubmitError({
                  kind: "code",
                  message: `Satuan ${line.name || "barang"} tidak valid`,
                }),
              );
            }
            if (!Number.isFinite(line.price) || line.price < 0) {
              return yield* Effect.fail(
                new SubmitError({
                  kind: "price",
                  message: `Harga ${line.name || "barang"} tidak valid`,
                }),
              );
            }
            // A discount that eats the whole line is a mistyped `Angka`/`PCS`,
            // not a sale. Reported per line, before the payment checks, so the
            // cashier is told which line and why instead of "Metode pembayaran
            // harus diisi" — and so no record can be stored with a zero line.
            if (discountsEatLine(line)) {
              return yield* Effect.fail(
                new SubmitError({
                  kind: "price",
                  message: `Diskon ${line.name || "barang"} melebihi harga barang`,
                }),
              );
            }
          }

          const subtotal = linesSubtotal(lines);
          const effects = recalcExtras(draft.extras, subtotal);
          const total = effects.reduce((running, effect) => running.plus(effect.eff), subtotal);
          const credit = input.credit === true;
          const rounding = credit ? 0 : draft.rounding;
          const grand = roundMoney(transactionGrandTotal(total, rounding), draft.fix);
          // Not just zero: a negative total (a discount or a deduction that
          // outruns the goods) used to pass here and be stored with a positive
          // tender and a positive "Kembalian".
          if (grand.isNegative() || grand.isZero()) {
            return yield* Effect.fail(
              new SubmitError({
                kind: "payment",
                message: "Total transaksi tidak boleh nol atau negatif",
              }),
            );
          }
          const pay = credit ? new Decimal(0) : roundMoney(paidTotal(draft.methods), draft.fix);
          if (!credit && pay.lessThan(grand)) {
            return yield* Effect.fail(
              new SubmitError({ kind: "payment", message: "Pembayaran belum mencukupi" }),
            );
          }

          const methods = credit
            ? draft.methods.map((method) => ({ methodId: method.methodId, pay: 0 }))
            : draft.methods
                .filter((method) => method.value !== 0)
                .map((method) => ({ methodId: method.methodId, pay: method.value }));
          if (!credit && methods.length === 0) {
            return yield* Effect.fail(
              new SubmitError({ kind: "payment", message: "Metode pembayaran harus diisi" }),
            );
          }

          const extraInputs = draft.extras.flatMap((extra, index) => {
            const effect = effects[index];
            if (effect === undefined || effect.eff.isZero()) return [];
            return [
              {
                name: extra.name,
                value: extra.value,
                eff: effect.eff.toNumber(),
                kind: extra.kind,
                flag: extra.flag,
              },
            ];
          });

          // A `dual` extra books twice. The twin is only ever written for a
          // sale: on a purchase the dual charge is already the outcoming side,
          // so mirroring it would add a record that says nothing new. The
          // writer drops the twin when the dual extras net to zero or less.
          const dual =
            draft.mode === "incoming"
              ? extraInputs.filter((extra) => (extra.flag & DUAL_FLAG) !== 0)
              : [];
          const mirror: RecordMirrorInput | undefined =
            dual.length === 0
              ? undefined
              : {
                  mode: "outcoming",
                  cashier: input.cashier,
                  note: draft.note,
                  fix: draft.fix,
                  methodId: METHOD_BASE_ID.cash,
                  extras: dual,
                };

          const paidAt = credit ? null : Date.now();
          const payload: RecordDraftInput = {
            draftId: draft.id,
            paidAt,
            creditAt: credit ? Date.now() : null,
            rounding,
            cashier: input.cashier,
            mode: draft.mode,
            pay: pay.toNumber(),
            note: draft.note,
            fix: draft.fix,
            customer: {
              id: draft.customerId,
              name: draft.customerName,
              phone: draft.customerPhone,
            },
            supplier: {
              id: draft.supplierId,
              name: draft.supplierName,
            },
            subTotal: subtotal.toNumber(),
            total: total.toNumber(),
            methods,
            listings: lines.map((line) => ({
              listingId: line.listingId ?? null,
              name: line.name,
              code: line.code,
              kind: line.kind ?? "",
              unit: line.unit,
              price: line.price,
              qty: line.qty,
              discounts: line.discounts
                .filter((discount) => discount.eff !== 0)
                .map((discount) => ({
                  kind: discount.kind,
                  value: discount.value,
                  eff: discount.eff,
                })),
            })),
            extras: extraInputs,
            mirror,
            images: draft.images.map((image) => ({
              order: image.order,
              name: image.name,
              mime: image.mime,
            })),
          };

          // The cart is about to become a record; no debounced rewrite may fire
          // after the record transaction deletes its row.
          const timer = timers.get(id);
          if (timer !== undefined) {
            clearTimeout(timer);
            timers.delete(id);
          }

          const recordId = yield* record.add.draft(payload).pipe(
            Effect.mapError((error) => new TransactionError({ message: error.message })),
            Effect.catchAll((error) => {
              schedule(id);
              return Effect.fail(error);
            }),
          );
          written.delete(id);
          yield* SubscriptionRef.update(draftsRef, (list) =>
            list.filter((candidate) => candidate.id !== id),
          );
          return recordId;
        });
      },
      unsubmit(recordId) {
        return Effect.gen(function* () {
          const saved = yield* readRecord(recordId);
          yield* ensureLoaded();
          const drafts = yield* SubscriptionRef.get(draftsRef);
          const draft = yield* draftFromRecord(saved, nextOrder(drafts));

          // Persist the restored cart first, then undo the record. If the second
          // step fails the cashier has both, which is recoverable; the reverse
          // would lose the sale.
          yield* persistDraft(draft);
          const removed = yield* Effect.either(
            record.delete
              .byId(recordId)
              .pipe(Effect.mapError((error) => new TransactionError({ message: error.message }))),
          );
          if (Either.isLeft(removed)) {
            // Do not leave a second copy of the sale behind: undo the restore,
            // then report the delete failure.
            yield* db
              .execute("DELETE FROM tx_records WHERE tx_record_id = $1", [draft.id])
              .pipe(Effect.catchAll(() => Effect.void));
            yield* SubscriptionRef.update(draftsRef, (list) =>
              list.filter((candidate) => candidate.id !== draft.id),
            );
            return yield* Effect.fail(removed.left);
          }
          return draft.id;
        });
      },
      add: {
        new(mode, flag = 0) {
          return Effect.gen(function* () {
            yield* ensureLoaded();
            const drafts = yield* SubscriptionRef.get(draftsRef);
            const order = nextOrder(drafts);
            const draft: Draft = {
              id: generateId(),
              order,
              flag,
              title: "Transaksi Baru",
              mode,
              fix: 0,
              note: "",
              customerId: null,
              customerName: "",
              customerPhone: "",
              supplierId: null,
              supplierName: "",
              rounding: 0,
              listings: [],
              extras: [],
              // A fresh draft opens with one cash payment ready to fill in.
              methods: [{ id: generateId(), methodId: METHOD_BASE_ID.cash, value: 0 }],
              images: [],
            };
            yield* SubscriptionRef.update(draftsRef, (list) => [...list, draft]);
            schedule(draft.id);
            return draft.id;
          });
        },
        fromRecord(recordId) {
          return Effect.gen(function* () {
            // Read the record before loading the carts: a missing or deleted
            // record fails without having touched the working state.
            const saved = yield* readRecord(recordId);
            yield* ensureLoaded();
            const drafts = yield* SubscriptionRef.get(draftsRef);
            const draft = yield* draftFromRecord(saved, nextOrder(drafts));
            // Nothing to schedule: the draft is written whole here, so the
            // debounced writer already has it in `written`.
            yield* persistDraft(draft);
            return draft.id;
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const drafts = yield* SubscriptionRef.get(draftsRef);
            const target = drafts.find((draft) => draft.id === id);
            const timer = timers.get(id);
            if (timer !== undefined) {
              clearTimeout(timer);
              timers.delete(id);
            }
            // Row first, ref second. The tab must not disappear from the screen
            // before SQLite agrees, or a failed delete comes back as a
            // "deleted" cart on the next hydrate — with the lines and prices it
            // was parked with — and the cashier has already been told it is gone.
            yield* db
              .execute("DELETE FROM tx_records WHERE tx_record_id = $1", [id])
              .pipe(Effect.mapError(toError));
            written.delete(id);
            yield* SubscriptionRef.update(draftsRef, (list) =>
              list.filter((draft) => draft.id !== id),
            );
            // The cascade drops the rows; the files are ours to remove.
            for (const img of target?.images ?? []) {
              yield* image
                .del(img.name)
                .pipe(
                  Effect.catchAll((error) =>
                    Effect.logError(`tx image delete failed: ${error.e.message}`),
                  ),
                );
            }
          });
        },
      },
      set: {
        fix(id, fix) {
          return update(id, (draft) => ({ ...draft, fix }));
        },
        title(id, title) {
          return update(id, (draft) => ({ ...draft, title }));
        },
        note(id, note) {
          return update(id, (draft) => ({ ...draft, note }));
        },
        mode(id, mode) {
          return update(id, (draft) => ({ ...draft, mode }));
        },
        customer(id, customerId) {
          return update(id, (draft) => ({ ...draft, customerId }));
        },
        customerName(id, customerName) {
          return update(id, (draft) => ({ ...draft, customerName }));
        },
        customerPhone(id, customerPhone) {
          return update(id, (draft) => ({ ...draft, customerPhone }));
        },
        supplier(id, supplierId) {
          return update(id, (draft) => ({ ...draft, supplierId }));
        },
        supplierName(id, supplierName) {
          return update(id, (draft) => ({ ...draft, supplierName }));
        },
        rounding(id, rounding) {
          return update(id, (draft) => ({ ...draft, rounding }));
        },
        store(id) {
          return update(id, (draft) => ({ ...draft, flag: draft.flag | STORED_FLAG }));
        },
        restore(id) {
          return update(id, (draft) => ({ ...draft, flag: draft.flag & ~STORED_FLAG }));
        },
      },
      listings: {
        set(id, listings) {
          return update(id, (draft) => ({ ...draft, listings }));
        },
      },
      extras: {
        set(id, extras) {
          return update(id, (draft) => ({ ...draft, extras }));
        },
      },
      methods: {
        set(id, methods) {
          return update(id, (draft) => ({ ...draft, methods }));
        },
      },
      images: {
        add(id, file) {
          return Effect.gen(function* () {
            if (file.size > MAX_IMAGE_SIZE) {
              return yield* Effect.fail(
                new TransactionError({ message: "Ukuran maksimum 10 MB." }),
              );
            }
            const mime = imageMimeOf(file.type);
            if (mime === null) {
              return yield* Effect.fail(
                new TransactionError({ message: "Format harus PNG, JPEG, atau WebP." }),
              );
            }
            const name = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
            yield* image
              .save(file, name)
              .pipe(Effect.mapError((error) => new TransactionError({ message: error.e.message })));

            const drafts = yield* SubscriptionRef.get(draftsRef);
            const draft = drafts.find((candidate) => candidate.id === id);
            const order =
              (draft?.images.reduce((max, img) => Math.max(max, img.order), -1) ?? -1) + 1;
            const imageId = generateId();
            yield* update(id, (current) => ({
              ...current,
              images: [...current.images, { id: imageId, order, name, mime }],
            }));
            return imageId;
          });
        },
        remove(id, imageId) {
          return Effect.gen(function* () {
            const drafts = yield* SubscriptionRef.get(draftsRef);
            const target = drafts
              .find((draft) => draft.id === id)
              ?.images.find((img) => img.id === imageId);
            yield* update(id, (draft) => ({
              ...draft,
              images: draft.images.filter((img) => img.id !== imageId),
            }));
            if (target !== undefined) {
              yield* image
                .del(target.name)
                .pipe(
                  Effect.catchAll((error) =>
                    Effect.logError(`tx image delete failed: ${error.e.message}`),
                  ),
                );
            }
          });
        },
      },
    };
  }),
);
