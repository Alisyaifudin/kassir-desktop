import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect } from "effect";
import { mockData } from "~/pages/Setting/Printer/mock-data";
import type { ReceiptInput, ReceiptOption } from "./printer";

/**
 * The printer boundary. The test-print screen renders the sentence the Rust
 * command returns — "Dikirim ke printer 'X'" rather than a bare success — and a
 * driver failure has to reach it as an `InvokeError` with a sentence, never the
 * raw plugin text.
 *
 * `print_receipt` carries the receipt's *data*, not a PDF: the layout and the
 * rendering happen in Rust, so the payload is the record, its lines, the shop's
 * identity and the roll layout — and the assertion below pins that shape, since
 * a renamed field would fail at deserialization in Rust, not here.
 */
type Call = { cmd: string; args: Record<string, unknown> };

const calls: Call[] = [];
let outcome: { kind: "value"; value: unknown } | { kind: "error"; error: unknown } = {
  kind: "value",
  value: [],
};

// The rest of the `core` surface is here because a module mock is process-wide:
// another test file may still import the event bridge, which needs it.
mock.module("@tauri-apps/api/core", () => ({
  transformCallback: () => 1,
  Channel: class {},
  convertFileSrc: (path: string) => path,
  isTauri: () => false,
  invoke: (cmd: string, args?: Record<string, unknown>) => {
    calls.push({ cmd, args: args ?? {} });
    return outcome.kind === "error" ? Promise.reject(outcome.error) : Promise.resolve(outcome.value);
  },
}));

const { getPrinters, printReceipt } = await import("./printer");

const receipt: ReceiptInput = {
  ...mockData,
  info: {
    name: "Kassir",
    owner: "Toko Contoh",
    address: "Jl. Contoh 1",
    footer: "Terima kasih",
    header: "Struk",
    showCashier: false,
  },
};

const option: ReceiptOption = {
  paperWidth: 58,
  padding: 5,
  size: { normal: 8, big: 10 },
};

beforeEach(() => {
  calls.length = 0;
  outcome = { kind: "value", value: [] };
});

describe("getPrinters", () => {
  test("returns the spooler's list", async () => {
    outcome = { kind: "value", value: [{ name: "EPSON TM-T20" }] };

    expect(await Effect.runPromise(getPrinters())).toEqual([{ name: "EPSON TM-T20" }]);
    expect(calls.map((call) => call.cmd)).toEqual(["get_printers"]);
  });

  test("a string refusal is shown as the driver's sentence", async () => {
    outcome = { kind: "error", error: "Layanan printer tidak berjalan" };

    const result = await Effect.runPromise(Effect.either(getPrinters()));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("InvokeError");
      expect(result.left.message).toBe("Layanan printer tidak berjalan");
    }
  });

  test("any other failure gets a sentence of ours", async () => {
    outcome = { kind: "error", error: { code: 5 } };

    const result = await Effect.runPromise(Effect.either(getPrinters()));

    expect(result._tag === "Left" && result.left.message).toBe("Gagal membaca daftar printer");
  });
});

describe("printReceipt", () => {
  test("hands the printer, the receipt and the roll layout to the command", async () => {
    outcome = { kind: "value", value: "Dikirim ke printer 'EPSON TM-T20'. Periksa printer." };

    const message = await Effect.runPromise(
      printReceipt("EPSON TM-T20", receipt, option),
    );

    expect(message).toBe("Dikirim ke printer 'EPSON TM-T20'. Periksa printer.");
    expect(calls).toEqual([
      { cmd: "print_receipt", args: { printerName: "EPSON TM-T20", data: receipt, option } },
    ]);
  });

  test("a string refusal is shown as-is", async () => {
    outcome = { kind: "error", error: "Kertas habis" };

    const result = await Effect.runPromise(
      Effect.either(printReceipt("EPSON", receipt, option)),
    );

    expect(result._tag === "Left" && result.left.message).toBe("Kertas habis");
  });

  test("a spooler failure gets a sentence of ours", async () => {
    outcome = { kind: "error", error: new Error("EIO") };

    const result = await Effect.runPromise(
      Effect.either(printReceipt("EPSON", receipt, option)),
    );

    expect(result._tag === "Left" && result.left.message).toBe("Gagal mencetak struk");
  });
});
