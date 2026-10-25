import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Decimal from "decimal.js";
import { Effect } from "effect";
import { MemoryRouter } from "react-router";

/**
 * The completion dialog is the one dialog the till meets on every sale, and the
 * key the cashier presses there is Enter — their finger is still on it from
 * `Bayar`. Radix focuses the first focusable child by default, which here is
 * `Batalkan`, the destructive exit: Enter right after a commit turned a finished
 * sale back into a draft and undid its stock movement. The cursor belongs on
 * `Cetak`, and it belongs back there after a failed print so Enter retries
 * instead of landing nowhere (the button is disabled while printing).
 */
let printResult: { ok: boolean; message?: string } = { ok: true };
const printed: unknown[] = [];

mock.module("~/pages/Record/Item/z-Receipt/program-print-receipt", () => ({
  programPrintReceipt: (record: unknown) => {
    printed.push(record);
    return Effect.succeed(printResult);
  },
}));

mock.module("~/services", () => ({
  service: {
    record: { get: { byId: () => Effect.succeed({ id: "r1" }) } },
    transaction: { unsubmit: () => Effect.succeed("draft-1") },
  },
}));

const { Complete } = await import("./z-Complete");

function renderDialog() {
  const closes: number[] = [];
  const restores: number[] = [];
  render(
    <MemoryRouter initialEntries={["/pos"]}>
      <Complete
        mode="sale"
        recordId="r1"
        total={new Decimal(10_000)}
        change={new Decimal(0)}
        fix={0}
        onRestoreStart={() => restores.push(1)}
        onRestoreEnd={() => restores.push(0)}
        onRestored={() => {}}
        onClose={() => closes.push(1)}
      />
    </MemoryRouter>,
  );
  return { closes, restores };
}

const printButton = () => screen.getByRole("button", { name: /Cetak|Tercetak/ });

describe("completion dialog focus", () => {
  test("the cursor lands on Cetak, not on Batalkan", async () => {
    printResult = { ok: true };
    renderDialog();

    await waitFor(() => expect(document.activeElement).toBe(printButton()));
  });

  test("the focused button is the one that prints", async () => {
    printResult = { ok: true };
    printed.length = 0;
    renderDialog();

    await waitFor(() => expect(document.activeElement).toBe(printButton()));
    // What Enter does to a focused button; no other control is one keypress away.
    fireEvent.click(document.activeElement as HTMLElement);

    await waitFor(() => expect(printed).toHaveLength(1));
  });

  test("a failed print leaves the cursor on Cetak to try again", async () => {
    printResult = { ok: false, message: "Printer tidak ditemukan" };
    renderDialog();

    await waitFor(() => expect(document.activeElement).toBe(printButton()));
    fireEvent.click(document.activeElement as HTMLElement);

    await waitFor(() => expect(screen.getByText("Printer tidak ditemukan")).toBeDefined());
    // The button was disabled while printing; focus must come back with it.
    await waitFor(() => expect(document.activeElement).toBe(printButton()));
  });

  test("nothing here closes the record: the undo still needs its own click", async () => {
    printResult = { ok: true };
    const { closes, restores } = renderDialog();

    await waitFor(() => expect(document.activeElement).toBe(printButton()));
    expect(restores).toHaveLength(0);
    expect(closes).toHaveLength(0);
  });
});
