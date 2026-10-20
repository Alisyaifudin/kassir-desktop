import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { TransactionError, TransactionService, type Draft, type DraftImage, type DraftImageMime, type DraftMethod, type DraftMode } from ".";
import { DatabaseService, type DbError, type Statement } from "../db";
import { NotFound } from "~/lib/effect-error";
import { generateId } from "~/lib/random";
import { image } from "~/lib/image";
import { DEBOUNCE_DELAY, METHOD_BASE_ID } from "~/lib/constants";

/** `tx_record_flag` bit 0: the draft that is open. */
const ACTIVE_BIT = 0b1;

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
  tx_record_supplier_id: string | null;
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

const SELECT_RECORDS = `
  SELECT tx_record_id, tx_record_order, tx_record_flag, tx_record_title,
         tx_record_mode, tx_record_fix, tx_record_note, tx_record_rounding,
         tx_record_customer_id, tx_record_supplier_id
  FROM tx_records
  ORDER BY tx_record_order`;

const SELECT_METHODS = `
  SELECT tx_method_id, tx_record_id, method_id, tx_method_value
  FROM tx_methods`;

const SELECT_IMAGES = `
  SELECT tx_image_id, tx_record_id, tx_image_order, tx_image_name, tx_image_mime
  FROM tx_images
  ORDER BY tx_image_order`;

function toError(error: DbError): TransactionError {
  return new TransactionError({ message: error.message });
}

function rowToDraft(row: RecordRow, methods: DraftMethod[], images: DraftImage[]): Draft {
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
    supplierId: row.tx_record_supplier_id,
    methods,
    images,
  };
}

/** The draft row plus its payments, the whole aggregate as one atomic rewrite. */
function statementsFor(draft: Draft): Statement[] {
  return [
    {
      sql: `INSERT INTO tx_records (
          tx_record_id, tx_record_order, tx_record_flag, tx_record_title,
          tx_record_mode, tx_record_query, tx_record_fix, tx_record_note,
          tx_record_rounding, tx_record_customer_id, tx_record_supplier_id
        ) VALUES ($1, $2, $3, $4, $5, '', $6, $7, $8, $9, $10)
        ON CONFLICT(tx_record_id) DO UPDATE SET
          tx_record_order = excluded.tx_record_order,
          tx_record_flag = excluded.tx_record_flag,
          tx_record_title = excluded.tx_record_title,
          tx_record_mode = excluded.tx_record_mode,
          tx_record_fix = excluded.tx_record_fix,
          tx_record_note = excluded.tx_record_note,
          tx_record_rounding = excluded.tx_record_rounding,
          tx_record_customer_id = excluded.tx_record_customer_id,
          tx_record_supplier_id = excluded.tx_record_supplier_id`,
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
        draft.supplierId,
      ],
    },
    { sql: `DELETE FROM tx_methods WHERE tx_record_id = $1`, bindings: [draft.id] },
    ...draft.methods.map((method) => ({
      sql: `INSERT INTO tx_methods (tx_method_id, tx_record_id, method_id, tx_method_value)
            VALUES ($1, $2, $3, $4)`,
      bindings: [method.id, draft.id, method.methodId, method.value],
    })),
    { sql: `DELETE FROM tx_images WHERE tx_record_id = $1`, bindings: [draft.id] },
    ...draft.images.map((img) => ({
      sql: `INSERT INTO tx_images (tx_image_id, tx_image_order, tx_image_name, tx_image_mime, tx_record_id)
            VALUES ($1, $2, $3, $4, $5)`,
      bindings: [img.id, img.order, img.name, img.mime, draft.id],
    })),
  ];
}

export const TransactionLive = Layer.effect(
  TransactionService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // The live cart, seeded empty so layer construction stays synchronous. A
    // change updates the ref right away; the database write is coalesced below.
    const draftsRef = yield* SubscriptionRef.make<Draft[]>([]);
    let loaded = false;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

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
        return records.map((row) =>
          rowToDraft(
            row,
            byRecord.get(row.tx_record_id) ?? [],
            imagesByRecord.get(row.tx_record_id) ?? [],
          ),
        );
      });
    }

    function hydrate(): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        const drafts = yield* load();
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

    function flush(id: string): Effect.Effect<void> {
      return Effect.gen(function* () {
        const drafts = yield* SubscriptionRef.get(draftsRef);
        const draft = drafts.find((d) => d.id === id);
        if (draft === undefined) return;
        yield* db
          .transaction(statementsFor(draft))
          .pipe(Effect.catchAll((error) => Effect.logError(`tx flush failed: ${error.message}`)));
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

    function update(id: string, change: (draft: Draft) => Draft): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        yield* SubscriptionRef.update(draftsRef, (drafts) =>
          drafts.map((draft) => (draft.id === id ? change(draft) : draft)),
        );
        schedule(id);
      });
    }

    function updateMany(ids: string[], change: (draft: Draft) => Draft): Effect.Effect<void, TransactionError> {
      return Effect.gen(function* () {
        const wanted = new Set(ids);
        yield* SubscriptionRef.update(draftsRef, (drafts) =>
          drafts.map((draft) => (wanted.has(draft.id) ? change(draft) : draft)),
        );
        for (const id of wanted) schedule(id);
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
      },
      add: {
        new(mode) {
          return Effect.gen(function* () {
            yield* ensureLoaded();
            const drafts = yield* SubscriptionRef.get(draftsRef);
            const order = drafts.reduce((max, draft) => Math.max(max, draft.order), -1) + 1;
            const draft: Draft = {
              id: generateId(),
              order,
              flag: 0,
              title: "Transaksi Baru",
              mode,
              fix: 0,
              note: "",
              customerId: null,
              supplierId: null,
              rounding: 0,
              // A fresh draft opens with one cash payment ready to fill in.
              methods: [{ id: generateId(), methodId: METHOD_BASE_ID.cash, value: 0 }],
              images: [],
            };
            yield* SubscriptionRef.update(draftsRef, (list) => [...list, draft]);
            schedule(draft.id);
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
            yield* SubscriptionRef.update(draftsRef, (list) =>
              list.filter((draft) => draft.id !== id),
            );
            yield* db
              .execute("DELETE FROM tx_records WHERE tx_record_id = $1", [id])
              .pipe(Effect.mapError(toError));
            // The cascade drops the rows; the files are ours to remove.
            for (const img of target?.images ?? []) {
              yield* image.del(img.name).pipe(
                Effect.catchAll((error) =>
                  Effect.logError(`tx image delete failed: ${error.e.message}`),
                ),
              );
            }
          });
        },
      },
      set: {
        active(id) {
          return Effect.gen(function* () {
            const drafts = yield* SubscriptionRef.get(draftsRef);
            const target = drafts.find((draft) => draft.id === id);
            if (target === undefined) return;
            const siblings = drafts
              .filter((draft) => draft.mode === target.mode)
              .map((draft) => draft.id);
            yield* updateMany(siblings, (draft) => ({
              ...draft,
              flag: draft.id === id ? draft.flag | ACTIVE_BIT : draft.flag & ~ACTIVE_BIT,
            }));
          });
        },
        fix(id, fix) {
          return update(id, (draft) => ({ ...draft, fix }));
        },
        title(id, title) {
          return update(id, (draft) => ({ ...draft, title }));
        },
        note(id, note) {
          return update(id, (draft) => ({ ...draft, note }));
        },
        customer(id, customerId) {
          return update(id, (draft) => ({ ...draft, customerId }));
        },
        supplier(id, supplierId) {
          return update(id, (draft) => ({ ...draft, supplierId }));
        },
        rounding(id, rounding) {
          return update(id, (draft) => ({ ...draft, rounding }));
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
              return yield* Effect.fail(new TransactionError({ message: "Ukuran maksimum 10 MB." }));
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
              yield* image.del(target.name).pipe(
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
