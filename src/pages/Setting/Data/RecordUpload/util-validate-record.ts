import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/effect-error";
import { log } from "~/lib/log";
import type { RecordImport } from "~/services/record";

export type { RecordImport } from "~/services/record";

const discountSchema = z.object({
  kind: z.enum(["number", "percent", "pcs"]),
  value: z.number(),
  eff: z.number(),
});

/**
 * One lot of an exported line, with the journal row it caused. The numbers are
 * the movement itself: the writer appends the event instead of replaying FIFO, so
 * a wrong sign is refused by `validateRecordPortion` in the service.
 *
 * `event` is null for a portion that moved no stock (a manual line).
 */
const portionSchema = z.object({
  unit: z.number().int().positive({ message: "Satuan tidak valid" }),
  qty: z.number().positive({ message: "Jumlah barang harus lebih dari nol" }),
  capital: z.number().nonnegative({ message: "Modal tidak boleh negatif" }),
  total: z.number(),
  event: z
    .object({
      id: z.string().nonempty(),
      createdAt: z.number().int(),
      value: z.number().int(),
      capital: z.number().nonnegative({ message: "Modal tidak boleh negatif" }),
      note: z.string(),
      productId: z.string().nonempty(),
      stockId: z.string().nullable(),
    })
    .nullable(),
});

/**
 * The shape *and the values* of a line. A backup is the one input the app takes
 * from outside its own writers, so the checks mirror `validateRecordLine` in
 * `src/services/record/validate-line.ts`: a negative or zero quantity, a
 * negative price/capital, or a record with no lines is refused here, before
 * anything is written, instead of corrupting the stock journal. (A negative qty
 * moves no stock on a sale — FIFO stops at `remaining > 0` — and creates a
 * negative lot on a purchase; both are permanent, event-sourced history.)
 */
const listingSchema = z.object({
  listingId: z.string().nullable(),
  name: z.string(),
  kind: z.string(),
  price: z.number().nonnegative({ message: "Harga tidak boleh negatif" }),
  qty: z.number().int().positive({ message: "Jumlah barang harus lebih dari nol" }),
  capital: z.number().nonnegative({ message: "Modal tidak boleh negatif" }),
  total: z.number(),
  discounts: z.array(discountSchema),
  // Optional on purpose: a file downloaded before the export carried its journal
  // rows has no `portions`, and is still imported the old way (as manual lines).
  portions: z
    .array(portionSchema)
    .min(1, { message: "Rincian stok tidak boleh kosong" })
    .optional(),
});

const extraSchema = z.object({
  name: z.string(),
  value: z.number(),
  eff: z.number(),
  kind: z.enum(["number", "percent"]),
});

const recordSchema: z.ZodType<RecordImport> = z.object({
  paidAt: z.number().int(),
  rounding: z.number(),
  isCredit: z.boolean(),
  cashier: z.string().trim().min(1, { message: "Nama kasir tidak boleh kosong" }),
  mode: z.enum(["incoming", "outcoming"]),
  pay: z.number(),
  note: z.string(),
  fix: z.number().int().min(0).max(100),
  customer: z.object({ name: z.string(), phone: z.string() }),
  supplier: z
    .object({ id: z.string().nullable(), name: z.string() })
    .optional(),
  subTotal: z.number(),
  total: z.number(),
  methods: z.array(
    z.object({ methodId: z.string().nonempty(), pay: z.number().nonnegative() }),
  ),
  listings: z.array(listingSchema).min(1, { message: "Catatan harus punya minimal satu barang" }),
  extras: z.array(extraSchema),
});

const recordsSchema: z.ZodType<RecordImport[]> = z
  .array(recordSchema)
  .min(1, { message: "Tidak boleh kosong" });

export const MAXIMUM_SIZE = 10e6; // 10 mb

export function extractRecord(file: File) {
  return Effect.gen(function* () {
    const isJsonFile = file.type === "application/json" || file.name.endsWith(".json");

    if (!isJsonFile) {
      return yield* Effect.fail(new JsonError("Format file tidak sah. Harus JSON."));
    }
    if (file.size > MAXIMUM_SIZE) {
      return yield* Effect.fail(new TooBigError(file.size));
    }

    const text = yield* Effect.tryPromise({
      try: () => file.text(),
      catch: (e) => new JsonError(e),
    });

    const json = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (e) => new JsonError(e),
    });

    const parsed = recordsSchema.safeParse(json);
    if (!parsed.success) {
      log.error(parsed.error);
      // Name the offending record and field: a 10 MB backup is not something to
      // search by hand, and "Cek lagi" alone gives the operator nothing to fix.
      const issue = parsed.error.issues[0];
      const at = issue?.path[0];
      const where =
        typeof at === "number" ? ` pada catatan ke-${at + 1}` : "";
      const detail = issue?.message ?? "Cek lagi.";
      return yield* Effect.fail(new JsonError(`Format data tidak sah${where}. ${detail}`));
    }

    return { records: parsed.data, name: file.name };
  });
}
