import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { ComboError, ComboService, type Combo, type ComboComponent, type ComboCover, type ComboExtra, type ComboInput } from ".";
import { DatabaseService, type DbError, type Statement } from "../db";
import { generateId } from "~/lib/random";
import { image } from "~/lib/image";
import { log } from "~/lib/log";

type ComboRow = {
  combo_id: string;
  combo_name: string;
  combo_active: number;
  combo_cover_name: string | null;
  combo_cover_mime: ComboCover["mime"] | null;
  combo_updated_at: number;
  combo_sync_at: number | null;
};

type ComponentRow = {
  combo_listing_id: string;
  combo_id: string;
  listing_id: string;
  combo_listing_qty: number;
  combo_listing_order: number;
};

type ExtraRow = {
  combo_extra_id: string;
  combo_id: string;
  extra_id: string;
  combo_extra_order: number;
};

const SELECT_COMBOS = `
  SELECT combo_id, combo_name, combo_active, combo_cover_name, combo_cover_mime,
         combo_updated_at, combo_sync_at
  FROM combos
  WHERE combo_deleted_at IS NULL
  ORDER BY combo_name COLLATE NOCASE ASC, combo_id ASC`;

function dbError(error: DbError): ComboError {
  return new ComboError({ message: error.message });
}

function rowToCombo(
  row: ComboRow,
  components: ComboComponent[],
  extras: ComboExtra[],
): Combo {
  return {
    id: row.combo_id,
    name: row.combo_name,
    active: row.combo_active === 1,
    cover:
      row.combo_cover_name === null || row.combo_cover_mime === null
        ? null
        : { name: row.combo_cover_name, mime: row.combo_cover_mime },
    components,
    extras,
    updatedAt: row.combo_updated_at,
    syncAt: row.combo_sync_at,
  };
}

function componentStatement(comboId: string, input: ComboInput["components"]): Statement[] {
  return input.map((component, order) => ({
    sql: `INSERT INTO combo_listings (
        combo_listing_id, combo_id, listing_id, combo_listing_qty, combo_listing_order
      ) VALUES ($1, $2, $3, $4, $5)`,
    bindings: [generateId(), comboId, component.listingId, component.quantity, order],
  }));
}

function extraStatement(comboId: string, ids: string[]): Statement[] {
  return ids.map((extraId, order) => ({
    sql: `INSERT INTO combo_extras (combo_extra_id, combo_id, extra_id, combo_extra_order)
          VALUES ($1, $2, $3, $4)`,
    bindings: [generateId(), comboId, extraId, order],
  }));
}

export const ComboLive = Layer.effect(
  ComboService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const combosRef = yield* SubscriptionRef.make<Combo[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Combo[], ComboError> {
      return Effect.gen(function* () {
        const rows = yield* db.selectMany<ComboRow>(SELECT_COMBOS).pipe(Effect.mapError(dbError));
        const ids = rows.map((row) => row.combo_id);
        if (ids.length === 0) return [];
        const marks = ids.map(() => "?").join(", ");
        const components = yield* db
          .selectMany<ComponentRow>(
            `SELECT combo_listing_id, combo_id, listing_id, combo_listing_qty, combo_listing_order
             FROM combo_listings WHERE combo_id IN (${marks})
             ORDER BY combo_listing_order, combo_listing_id`,
            ids,
          )
          .pipe(Effect.mapError(dbError));
        const extras = yield* db
          .selectMany<ExtraRow>(
            `SELECT combo_extra_id, combo_id, extra_id, combo_extra_order
             FROM combo_extras WHERE combo_id IN (${marks})
             ORDER BY combo_extra_order, combo_extra_id`,
            ids,
          )
          .pipe(Effect.mapError(dbError));
        const componentsByCombo = new Map<string, ComboComponent[]>();
        for (const row of components) {
          const list = componentsByCombo.get(row.combo_id) ?? [];
          list.push({
            id: row.combo_listing_id,
            listingId: row.listing_id,
            quantity: row.combo_listing_qty,
            order: row.combo_listing_order,
          });
          componentsByCombo.set(row.combo_id, list);
        }
        const extrasByCombo = new Map<string, ComboExtra[]>();
        for (const row of extras) {
          const list = extrasByCombo.get(row.combo_id) ?? [];
          list.push({ id: row.combo_extra_id, extraId: row.extra_id, order: row.combo_extra_order });
          extrasByCombo.set(row.combo_id, list);
        }
        return rows.map((row) =>
          rowToCombo(row, componentsByCombo.get(row.combo_id) ?? [], extrasByCombo.get(row.combo_id) ?? []),
        );
      });
    }

    function hydrate(): Effect.Effect<void, ComboError> {
      return load().pipe(
        Effect.tap((combos) => SubscriptionRef.set(combosRef, combos)),
        Effect.tap(() => Effect.sync(() => (loaded = true))),
        Effect.asVoid,
      );
    }

    function ensureLoaded(): Effect.Effect<void, ComboError> {
      return loaded ? Effect.void : hydrate();
    }

    function commit(statements: Statement[]) {
      return db.transaction(statements).pipe(Effect.mapError(dbError));
    }

    function validate(input: ComboInput, exceptId: string | null): Effect.Effect<string, ComboError> {
      return Effect.gen(function* () {
        const name = input.name.trim();
        if (name === "") return yield* Effect.fail(new ComboError({ message: "Nama combo harus diisi." }));
        if (input.components.length === 0) {
          return yield* Effect.fail(new ComboError({ message: "Tambahkan minimal satu listing." }));
        }
        if (input.components.some((component) => !Number.isInteger(component.quantity) || component.quantity < 1)) {
          return yield* Effect.fail(new ComboError({ message: "Jumlah listing harus bilangan bulat minimal 1." }));
        }
        if (new Set(input.components.map((component) => component.listingId)).size !== input.components.length) {
          return yield* Effect.fail(new ComboError({ message: "Listing yang sama tidak boleh ditambahkan dua kali." }));
        }
        if (new Set(input.extraIds).size !== input.extraIds.length) {
          return yield* Effect.fail(new ComboError({ message: "Tambahan yang sama tidak boleh dipilih dua kali." }));
        }
        const duplicate = yield* db
          .selectMany<{ combo_id: string }>(
            `SELECT combo_id FROM combos
             WHERE combo_deleted_at IS NULL AND combo_name = $1 COLLATE NOCASE
               AND ($2 IS NULL OR combo_id <> $2) LIMIT 1`,
            [name, exceptId],
          )
          .pipe(Effect.mapError(dbError));
        if (duplicate.length > 0) {
          return yield* Effect.fail(new ComboError({ message: "Nama combo sudah digunakan." }));
        }

        const listingIds = input.components.map((component) => component.listingId);
        const listingMarks = listingIds.map(() => "?").join(", ");
        const liveListings = yield* db
          .selectMany<{ listing_id: string }>(
            `SELECT l.listing_id
             FROM listings l JOIN products p ON p.product_id = l.product_id
             WHERE l.listing_deleted_at IS NULL AND p.product_deleted_at IS NULL
               AND (p.product_flag & 1) = 0 AND l.listing_id IN (${listingMarks})`,
            listingIds,
          )
          .pipe(Effect.mapError(dbError));
        if (liveListings.length !== listingIds.length) {
          return yield* Effect.fail(
            new ComboError({ message: "Satu atau lebih listing combo sudah tidak tersedia." }),
          );
        }
        if (input.extraIds.length > 0) {
          const marks = input.extraIds.map(() => "?").join(", ");
          const liveExtras = yield* db
            .selectMany<{ extra_id: string }>(
              `SELECT extra_id FROM extras WHERE extra_deleted_at IS NULL AND extra_id IN (${marks})`,
              input.extraIds,
            )
            .pipe(Effect.mapError(dbError));
          if (liveExtras.length !== input.extraIds.length) {
            return yield* Effect.fail(
              new ComboError({ message: "Satu atau lebih biaya atau potongan sudah tidak tersedia." }),
            );
          }
        }
        return name;
      });
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(combosRef))),
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(combosRef.changes))),
      },
      add(input) {
        return Effect.gen(function* () {
          const name = yield* validate(input, null);
          const id = generateId();
          const now = Date.now();
          const statements: Statement[] = [
            {
              sql: `INSERT INTO combos (
                  combo_id, combo_name, combo_active, combo_cover_name, combo_cover_mime,
                  combo_updated_at, combo_sync_at, combo_deleted_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
              bindings: [id, name, input.active ? 1 : 0, input.cover?.name ?? null, input.cover?.mime ?? null, now],
            },
            ...componentStatement(id, input.components),
            ...extraStatement(id, input.extraIds),
          ];
          yield* commit(statements);
          yield* hydrate();
          return id;
        });
      },
      set: {
        info(id, input) {
          return Effect.gen(function* () {
            yield* ensureLoaded();
            const name = yield* validate(input, id);
            const previous = (yield* SubscriptionRef.get(combosRef)).find((combo) => combo.id === id);
            if (previous === undefined) {
              return yield* Effect.fail(new ComboError({ message: "Combo tidak ditemukan." }));
            }
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE combos SET
                    combo_name = $1, combo_active = $2, combo_cover_name = $3, combo_cover_mime = $4,
                    combo_updated_at = max($5, combo_updated_at + 1), combo_sync_at = NULL
                  WHERE combo_id = $6 AND combo_deleted_at IS NULL`,
                bindings: [name, input.active ? 1 : 0, input.cover?.name ?? null, input.cover?.mime ?? null, now, id],
              },
              { sql: `DELETE FROM combo_listings WHERE combo_id = $1`, bindings: [id] },
              ...componentStatement(id, input.components),
              { sql: `DELETE FROM combo_extras WHERE combo_id = $1`, bindings: [id] },
              ...extraStatement(id, input.extraIds),
            ]);
            yield* hydrate();
            if (previous.cover !== null && previous.cover.name !== input.cover?.name) {
              yield* image.del(previous.cover.name).pipe(
                Effect.catchAll((error) =>
                  Effect.sync(() => log.error(`combo cover delete failed: ${error.e.message}`)),
                ),
              );
            }
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            yield* ensureLoaded();
            const previous = (yield* SubscriptionRef.get(combosRef)).find((combo) => combo.id === id);
            if (previous === undefined) {
              return yield* Effect.fail(new ComboError({ message: "Combo tidak ditemukan." }));
            }
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE combos SET
                    combo_cover_name = NULL, combo_cover_mime = NULL,
                    combo_deleted_at = max($1, combo_updated_at + 1),
                    combo_updated_at = max($1, combo_updated_at + 1), combo_sync_at = NULL
                  WHERE combo_id = $2 AND combo_deleted_at IS NULL`,
                bindings: [now, id],
              },
            ]);
            yield* hydrate();
            if (previous.cover !== null) {
              yield* image.del(previous.cover.name).pipe(
                Effect.catchAll((error) =>
                  Effect.sync(() => log.error(`combo cover delete failed: ${error.e.message}`)),
                ),
              );
            }
          });
        },
      },
      refresh: hydrate,
    };
  }),
);
