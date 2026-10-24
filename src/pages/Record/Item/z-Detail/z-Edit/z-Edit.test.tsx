import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { RecordFull, RecordMethod } from "~/services/record";

/**
 * The dialog restates the note and nothing else: the payments are edited in the
 * money band behind its pencil, so no method picker or amount field may appear
 * here — that is the clutter this dialog was carrying.
 */

const calls: string[] = [];

mock.module("~/services", () => ({
  service: {
    record: {
      set: {
        note: (id: string, note: string) => {
          calls.push(`note:${id}:${note}`);
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

function method(methodId: string, pay: number, kind: "cash" | "qris" = "cash"): RecordMethod {
  return { id: `rm-${methodId}`, methodId, pay, name: null, kind };
}

function recordFixture(
  methods: RecordMethod[],
  overrides: Partial<RecordFull> = {},
): RecordFull {
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
    ...overrides,
  };
}

async function openDialog(record: RecordFull) {
  render(<EditDialog record={record} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  await screen.findByRole("dialog");
}

describe("EditDialog", () => {
  test("shows only the note, not the payment fields", async () => {
    await openDialog(recordFixture([method("1000", 10000)]));

    expect(screen.getByLabelText("Catatan")).toBeDefined();
    expect(screen.queryByRole("combobox", { name: "Metode" })).toBeNull();
    expect(screen.queryByLabelText("Jumlah pembayaran 1")).toBeNull();
  });

  test("saves the note", async () => {
    calls.length = 0;
    await openDialog(recordFixture([method("1000", 10000)]));

    fireEvent.change(screen.getByLabelText("Catatan"), { target: { value: "baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(calls).toEqual(["note:r1:baru"]));
  });
});
