import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import { RecordError, type RecordFull, type RecordMethod } from "~/services/record";

/**
 * The edit dialog saves two fields behind one Simpan, so the pairing is what
 * needs pinning: a correction that moved only one of them must not restate the
 * other, and a failure must leave the dialog open with the message.
 */

const calls: string[] = [];
let failOn: "note" | "method" | null = null;

mock.module("~/services", () => ({
  service: {
    record: {
      set: {
        note: (id: string, note: string) => {
          calls.push(`note:${id}:${note}`);
          return failOn === "note"
            ? Effect.fail(new RecordError({ message: "Gagal menyimpan catatan" }))
            : Effect.succeed(undefined);
        },
        method: (id: string, methodId: string) => {
          calls.push(`method:${id}:${methodId}`);
          return failOn === "method"
            ? Effect.fail(new RecordError({ message: "Metode tidak ditemukan" }))
            : Effect.succeed(undefined);
        },
      },
    },
  },
}));

const { useSaveEdit } = await import("./use-edit");

function method(methodId: string): RecordMethod {
  return { id: `rm-${methodId}`, methodId, pay: 10000, name: null, kind: "cash" };
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
  test("a method correction leaves the note alone", async () => {
    calls.length = 0;
    closed = 0;
    failOn = null;
    const { result } = harness(recordFixture([method("1000")]));

    act(() => result.current.setMethodId("1003"));
    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual(["method:r1:1003"]);
    expect(closed).toBe(1);
    expect(result.current.error).toBeNull();
  });

  test("a note correction leaves the method alone", async () => {
    calls.length = 0;
    closed = 0;
    failOn = null;
    const { result } = harness(recordFixture([method("1000")]));

    act(() => result.current.setNote("baru"));
    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual(["note:r1:baru"]);
    expect(closed).toBe(1);
  });

  test("both corrections land in one save", async () => {
    calls.length = 0;
    closed = 0;
    failOn = null;
    const { result } = harness(recordFixture([method("1000")]));

    act(() => {
      result.current.setNote("baru");
      result.current.setMethodId("1003");
    });
    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual(["note:r1:baru", "method:r1:1003"]);
    expect(closed).toBe(1);
  });

  test("an untouched dialog writes nothing", async () => {
    calls.length = 0;
    closed = 0;
    failOn = null;
    const { result } = harness(recordFixture([method("1000")]));

    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual([]);
    expect(closed).toBe(1);
  });

  test("a split payment has no method to correct", async () => {
    calls.length = 0;
    closed = 0;
    failOn = null;
    const { result } = harness(recordFixture([method("1000"), method("1003")]));

    expect(result.current.methodId).toBeNull();
    act(() => result.current.setNote("baru"));
    await act(async () => {
      await result.current.save();
    });

    expect(calls).toEqual(["note:r1:baru"]);
  });

  test("a refused method keeps the dialog open and says why", async () => {
    calls.length = 0;
    closed = 0;
    failOn = "method";
    const { result } = harness(recordFixture([method("1000")]));

    act(() => result.current.setMethodId("1003"));
    await act(async () => {
      await result.current.save();
    });

    expect(closed).toBe(0);
    expect(result.current.error).toBe("Metode tidak ditemukan");
    failOn = null;
  });
});
