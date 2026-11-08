import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { RecordFull, RecordListing } from "~/services/record";

/**
 * The escape hatch for a wrong `modal`.
 *
 * Three rules are pinned here because each of them is what keeps a rewrite of
 * money from being an ordinary edit: a cashier never sees the door, the dialog
 * says out loud what it does *not* fix, and it will not save without a reason —
 * the note line is the only trace the write leaves.
 */

const calls: { id: string; listingId: string; capital: number; reason: string; by: string }[] = [];
let role: "admin" | "user" = "admin";

mock.module("~/services", () => ({
  service: {
    record: {
      set: {
        lineCapital: (
          id: string,
          listingId: string,
          input: { capital: number; reason: string; by: string },
        ) => {
          calls.push({ id, listingId, ...input });
          return Effect.succeed(undefined);
        },
      },
    },
  },
}));

mock.module("~/hooks/use-user", () => ({
  useUser: () => ({ id: "u1", name: "Ali", role }),
}));

const { LineCapital } = await import(".");

const listing: RecordListing = {
  id: "g1",
  productId: "p1",
  name: "Kartu Elektronik Mandiri",
  kind: "retail",
  unit: 1,
  price: 100_000,
  qty: 1,
  capital: 2_327_000,
  total: 100_000,
  discounts: [],
  portions: [],
};

const record: RecordFull = {
  id: "r1",
  createdAt: 10,
  date: 10,
  paidAt: 10,
  creditAt: null,
  rounding: 0,
  isCredit: false,
  cashier: "Kasir",
  mode: "incoming",
  pay: 100_000,
  note: "",
  fix: 0,
  customer: { name: "", phone: "" },
  supplier: { id: null, name: "" },
  subTotal: 100_000,
  total: 100_000,
  grandTotal: 100_000,
  change: 0,
  methods: [],
  updatedAt: 10,
  syncAt: null,
  deletedAt: null,
  pairId: null,
  listings: [listing],
  extras: [],
};

const trigger = () => screen.queryByRole("button", { name: /Ubah modal tercatat/ });

async function open() {
  render(<LineCapital record={record} listing={listing} />);
  fireEvent.click(trigger()!);
  await screen.findByRole("dialog");
}

describe("LineCapital", () => {
  beforeEach(() => {
    calls.length = 0;
    role = "admin";
  });

  test("a cashier has no door to open", () => {
    role = "user";
    render(<LineCapital record={record} listing={listing} />);
    expect(trigger()).toBeNull();
  });

  test("the warning names what the write does not fix", async () => {
    await open();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("menulis ulang angka uang");
    // The lot is the trap: fixing the record does not fix the stock it drew from,
    // so the next sale of the product inherits the same wrong figure.
    expect(alert.textContent).toContain("Stok tidak ikut diperbaiki");
    expect(alert.textContent).toContain("Alasan dan nama Anda dicatat");
  });

  test("refuses to save until a reason is typed", async () => {
    await open();

    const save = screen.getByRole("button", { name: /Ya, ubah modal/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Alasan"), { target: { value: "salah input" } });
    expect(save.disabled).toBe(false);
  });

  test("sends the new cost, the reason, and who wrote it", async () => {
    await open();

    fireEvent.change(screen.getByLabelText("Modal baru"), { target: { value: "Rp58.950" } });
    fireEvent.change(screen.getByLabelText("Alasan"), {
      target: { value: "salah input waktu beli" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ya, ubah modal/ }));

    await waitFor(() =>
      expect(calls).toEqual([
        {
          id: "r1",
          listingId: "g1",
          capital: 58_950,
          reason: "salah input waktu beli",
          by: "Ali",
        },
      ]),
    );
  });

  test("says whether the figure it will save is one the reports believe", async () => {
    await open();

    // 58.950 is below the 100.000 it sold for, so the line has a margin again.
    fireEvent.change(screen.getByLabelText("Modal baru"), { target: { value: "Rp58.950" } });
    expect(screen.getByText(/Laba baris ini menjadi/).textContent).toContain("41.050");

    // Above the price it is still not a cost: the reports will keep printing a
    // dash, and the dialog must not promise otherwise.
    fireEvent.change(screen.getByLabelText("Modal baru"), { target: { value: "Rp150.000" } });
    expect(screen.getByText(/laba baris tetap dibaca/)).toBeDefined();
  });
});
