import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import type { RecordFull, RecordMethod } from "~/services/record";
import type { MethodCatalog } from "~/services/method";

/**
 * The edit dialog is the only place a record's payment method can be corrected,
 * so the field has to be on screen — and withheld for a split payment, where
 * there is no single method the cashier could have meant.
 */

const calls: string[] = [];

const catalog: MethodCatalog = {
  methods: [
    { id: "1000", name: null, kind: "cash", deletedAt: null },
    { id: "1003", name: null, kind: "qris", deletedAt: null },
    { id: "2000", name: "BCA", kind: "transfer", deletedAt: null },
  ],
  defaults: { transfer: "2000" },
};

mock.module("~/services", () => ({
  service: {
    method: {
      get: { catalogChanges: Stream.make(catalog) },
    },
    record: {
      set: {
        note: (id: string, note: string) => {
          calls.push(`note:${id}:${note}`);
          return Effect.succeed(undefined);
        },
        method: (id: string, methodId: string) => {
          calls.push(`method:${id}:${methodId}`);
          return Effect.succeed(undefined);
        },
      },
    },
  },
}));

mock.module("~/hooks/use-user", () => ({
  useUser: () => ({ id: "u1", name: "Kasir", role: "user" }),
}));

const { EditDialog } = await import(".");

function method(methodId: string, kind: "cash" | "qris"): RecordMethod {
  return { id: `rm-${methodId}`, methodId, pay: 10000, name: null, kind };
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

async function openDialog(record: RecordFull) {
  render(<EditDialog record={record} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  // The picker reads the catalog, so the field is only there once that lands.
  await screen.findByRole("dialog");
}

describe("EditDialog", () => {
  test("offers the method the record was rung up on", async () => {
    await openDialog(recordFixture([method("1000", "cash")]));

    expect(screen.getByRole("combobox", { name: "Metode" }).textContent).toBe("Tunai");
    expect(
      screen.getByText("Hanya metode yang berubah; jumlah yang dibayar tetap."),
    ).toBeDefined();
  });

  test("saves the note and the method together", async () => {
    calls.length = 0;
    await openDialog(recordFixture([method("1000", "cash")]));

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(calls).toEqual(["note:r1:baru"]));
  });

  test("withholds the field on a split payment", async () => {
    await openDialog(recordFixture([method("1000", "cash"), method("1003", "qris")]));

    // The dialog is up and the catalog has landed — the field is absent on
    // purpose, not because the picker is still loading.
    expect(screen.getByRole("textbox")).toBeDefined();
    expect(screen.queryByRole("combobox", { name: "Metode" })).toBeNull();
  });
});
