import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import type { MethodCatalog } from "~/services/method";
import type { RecordFull, RecordMethod } from "~/services/record";

/**
 * The money band is where the settlement is read *and* corrected, so two things
 * need pinning: the figures it prints (a rounding earns its own line, a split
 * earns a sum, a zero change is not printed), and the editor the pencil opens —
 * one field row per method, one Simpan for the whole list.
 */

const calls: string[] = [];

const catalog: MethodCatalog = {
  methods: [
    { id: "1000", name: null, kind: "cash", deletedAt: null },
    { id: "1003", name: null, kind: "qris", deletedAt: null },
    { id: "2000", name: "Mandiri", kind: "transfer", deletedAt: null },
  ],
  defaults: { transfer: "2000" },
};

mock.module("~/services", () => ({
  service: {
    method: { get: { catalogChanges: Stream.make(catalog) } },
    record: {
      set: {
        payment: (id: string, payments: { methodId: string; pay: number }[]) => {
          calls.push(
            `payment:${id}:${payments.map((payment) => `${payment.methodId}=${payment.pay}`).join(",")}`,
          );
          return Effect.succeed(undefined);
        },
      },
    },
  },
}));

const { Money } = await import("./z-Money");

function cash(pay: number): RecordMethod {
  return { id: "rm-cash", methodId: "1000", pay, name: null, kind: "cash" };
}

function mandiri(pay: number): RecordMethod {
  return { id: "rm-mandiri", methodId: "2000", pay, name: "Mandiri", kind: "transfer" };
}

function recordFixture(overrides: Partial<RecordFull> = {}): RecordFull {
  return {
    id: "r1",
    createdAt: 10,
    date: 10,
    paidAt: 10,
    creditAt: null,
    rounding: 500,
    isCredit: false,
    cashier: "Kasir",
    mode: "incoming",
    pay: 20000,
    note: "",
    fix: 0,
    customer: { name: "", phone: "" },
    supplier: { id: null, name: "" },
    subTotal: 39500,
    total: 39500,
    grandTotal: 40000,
    change: 0,
    methods: [cash(20000)],
    updatedAt: 10,
    syncAt: null,
    deletedAt: null,
    pairId: null,
    listings: [],
    extras: [],
    ...overrides,
  };
}

function split(): RecordFull {
  return recordFixture({
    methods: [cash(20000), mandiri(25000)],
    pay: 45000,
    change: 5000,
  });
}

/** The figure printed to the right of `label`. */
function figure(label: string): string | null | undefined {
  return screen.getByText(label).nextElementSibling?.textContent;
}

function renderMoney(record: RecordFull, editable = false) {
  return render(<Money record={record} editable={editable} />);
}

/** Open the editor and wait for the method catalog the rows need. */
async function openEditor(record: RecordFull) {
  renderMoney(record, true);
  fireEvent.click(screen.getByLabelText("Sunting pembayaran"));
  await screen.findByLabelText("Jumlah pembayaran 1");
}

describe("Money", () => {
  test("a rounding earns its own line and a total above the payments", () => {
    renderMoney(split());

    expect(figure("Total")).toBe("Rp39.500");
    expect(figure("Pembulatan")).toBe("Rp500");
    expect(figure("Total Keseluruhan")).toBe("Rp40.000");
    expect(figure("Tunai")).toBe("Rp20.000");
    expect(figure("Mandiri")).toBe("Rp25.000");
    expect(figure("Total Pembayaran")).toBe("Rp45.000");
    expect(figure("Kembalian")).toBe("Rp5.000");
  });

  test("with no rounding the single total is the answer", () => {
    renderMoney(recordFixture({ rounding: 0, grandTotal: 39500, pay: 39500 }));

    expect(figure("Total")).toBe("Rp39.500");
    expect(screen.queryByText("Pembulatan")).toBeNull();
    expect(screen.queryByText("Total Keseluruhan")).toBeNull();
  });

  test("a lone method is its own label, with no sum and no zero change", () => {
    renderMoney(recordFixture());

    expect(figure("Tunai")).toBe("Rp20.000");
    expect(screen.queryByText("Total Pembayaran")).toBeNull();
    expect(screen.queryByText("Kembalian")).toBeNull();
  });

  test("a credit says so instead of printing payments", () => {
    renderMoney(
      recordFixture({
        paidAt: null,
        creditAt: 5,
        isCredit: true,
        rounding: 0,
        pay: 0,
        methods: [cash(0)],
      }),
      true,
    );

    expect(figure("Kredit")).toBe("Belum dibayar");
    expect(screen.queryByLabelText("Sunting pembayaran")).toBeNull();
    expect(screen.queryByText("Tunai")).toBeNull();
  });

  test("the pencil belongs to the full page, not the preview", () => {
    renderMoney(recordFixture(), false);
    expect(screen.queryByLabelText("Sunting pembayaran")).toBeNull();

    renderMoney(recordFixture(), true);
    expect(screen.getByLabelText("Sunting pembayaran")).toBeDefined();
  });

  test("the pencil turns the rows into fields with the record's own values", async () => {
    await openEditor(split());

    expect((screen.getByLabelText("Jumlah pembayaran 1") as HTMLInputElement).value).toBe(
      "Rp20.000",
    );
    expect((screen.getByLabelText("Jumlah pembayaran 2") as HTMLInputElement).value).toBe(
      "Rp25.000",
    );
    expect(screen.getByRole("button", { name: "Batalkan" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tambah metode" })).toBeDefined();
    // The charges above stay put; the totals below follow the draft.
    expect(figure("Total Keseluruhan")).toBe("Rp40.000");
    expect(figure("Total Pembayaran")).toBe("Rp45.000");
    expect(figure("Kembalian")).toBe("Rp5.000");
  });

  test("a restated amount saves the whole list", async () => {
    calls.length = 0;
    await openEditor(split());

    fireEvent.change(screen.getByLabelText("Jumlah pembayaran 1"), {
      target: { value: "Rp21.000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(calls).toEqual(["payment:r1:1000=21000,2000=25000"]));
    // A saved editor closes; the page's revision is what re-reads the record.
    expect(screen.queryByLabelText("Jumlah pembayaran 1")).toBeNull();
  });

  test("plus adds a row holding what the rows above leave", async () => {
    calls.length = 0;
    await openEditor(recordFixture());

    // One row means nothing to split yet: the last row cannot be removed.
    expect(
      (screen.getByRole("button", { name: "Hapus pembayaran 1" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.change(screen.getByLabelText("Jumlah pembayaran 1"), {
      target: { value: "Rp30.000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah metode" }));

    const added = (await screen.findByLabelText("Jumlah pembayaran 2")) as HTMLInputElement;
    expect(added.value).toBe("Rp10.000");

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(calls).toEqual(["payment:r1:1000=30000,1000=10000"]));
  });

  test("a split can drop a row", async () => {
    calls.length = 0;
    await openEditor(split());

    fireEvent.click(screen.getByRole("button", { name: "Hapus pembayaran 2" }));
    fireEvent.change(screen.getByLabelText("Jumlah pembayaran 1"), {
      target: { value: "Rp40.000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(calls).toEqual(["payment:r1:1000=40000"]));
  });

  test("a short draft says so and writes nothing", async () => {
    calls.length = 0;
    await openEditor(split());

    fireEvent.change(screen.getByLabelText("Jumlah pembayaran 1"), {
      target: { value: "Rp10.000" },
    });
    // The band counts the shortfall while the field is still open.
    expect(figure("Kurang")).toBe("Rp5.000");

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(
      screen.getByText("Pembayaran tidak cukup, minimal 40.000"),
    ).toBeDefined();
    expect(calls).toEqual([]);
    expect(screen.getByLabelText("Jumlah pembayaran 1")).toBeDefined();
  });

  test("Batalkan throws the draft away", async () => {
    await openEditor(split());

    fireEvent.change(screen.getByLabelText("Jumlah pembayaran 1"), {
      target: { value: "Rp21.000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Batalkan" }));

    expect(figure("Tunai")).toBe("Rp20.000");
    expect(figure("Kembalian")).toBe("Rp5.000");
    expect(screen.queryByLabelText("Jumlah pembayaran 1")).toBeNull();
  });
});
