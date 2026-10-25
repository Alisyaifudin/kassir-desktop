import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import { RecordError, type RecordFull, type RecordMethod } from "~/services/record";

/**
 * The edit dialog's only field is the note — the payments moved to the money
 * band — so what needs pinning is that an untouched dialog writes nothing and a
 * refusal leaves it open with the message.
 */

const calls: string[] = [];
let fail = false;

mock.module("~/services", () => ({
  service: {
    record: {
      set: {
        note: (id: string, note: string) => {
          calls.push(`note:${id}:${note}`);
          return fail
            ? Effect.fail(new RecordError({ message: "Gagal menyimpan catatan" }))
            : Effect.succeed(undefined);
        },
      },
    },
  },
}));

const { useSaveEdit } = await import("./use-edit");

function method(methodId: string, pay: number): RecordMethod {
  return { id: `rm-${methodId}`, methodId, pay, name: null, kind: "cash" };
}

function recordFixture(methods: RecordMethod[]): RecordFull {
  return {
    id: "r1",
    createdAt: 10,
    date: 10,
    paidAt: 10,
    creditAt: null,
    rounding: 0,
    isCredit: false,
    cashier: "Kasir",
    mode: "incoming",
    pay: 10000,
    note: "lama",
    fix: 0,
    customer: { name: "", phone: "" },
    supplier: { id: null, name: "" },
    subTotal: 10000,
    total: 10000,
    grandTotal: 10000,
    change: 0,
    methods,
    updatedAt: 10,
    syncAt: null,
    deletedAt: null,
    pairId: null,
    listings: [],
    extras: [],
  };
}

let closed = 0;

function harness(record: RecordFull) {
  return renderHook(() => useSaveEdit(record, () => (closed += 1), true));
}

describe("useSaveEdit", () => {
  test("saves the restated note", async () => {
    calls.length = 0;
    closed = 0;
    fail = false;
    const { result } = harness(recordFixture([method("1000", 10000)]));

    act(() => result.current.setNote("baru"));
    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual(["note:r1:baru"]);
    expect(closed).toBe(1);
    expect(result.current.error).toBeNull();
  });

  test("an untouched dialog writes nothing", async () => {
    calls.length = 0;
    closed = 0;
    fail = false;
    const { result } = harness(recordFixture([method("1000", 10000)]));

    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual([]);
    expect(closed).toBe(1);
  });

  test("a refused note keeps the dialog open and says why", async () => {
    calls.length = 0;
    closed = 0;
    fail = true;
    const { result } = harness(recordFixture([method("1000", 10000)]));

    act(() => result.current.setNote("baru"));
    await act(async () => {
      await result.current.save();
    });

    expect(closed).toBe(0);
    expect(result.current.error).toBe("Gagal menyimpan catatan");
    fail = false;
  });
});
