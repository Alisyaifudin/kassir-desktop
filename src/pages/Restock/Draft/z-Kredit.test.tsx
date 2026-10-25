import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Kredit } from "./z-Kredit";

/**
 * The confirmation that turns a whole purchase into debt. The success path used
 * to leave the dialog open while the page mounted its own `Complete`, so after
 * dismissing `Complete` the operator was looking at a stale "Catat sebagai
 * utang?" bound to a cart that no longer existed — and its button could submit
 * whatever draft was active by then.
 */
describe("Kredit", () => {
  test("a successful credit submit closes the confirmation", async () => {
    render(<Kredit onCredit={async () => null} disabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Kredit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Kredit" }));

    // `data-state`, not the unmount: Radix keeps the node until its exit
    // animation ends, and this DOM has no animation engine, so the node lingers
    // through a ~3 s synchronous cleanup that only ends when the test is over.
    // Waiting for the unmount made this the slowest test in the suite by far and
    // put it within a second of bun's 5 s ceiling on the Windows CI runner, where
    // it did fail. The state flip is the fact the operator sees: the confirmation
    // is closing because the purchase is already committed.
    await waitFor(() => {
      expect(dialog.getAttribute("data-state")).toBe("closed");
    });
  });

  test("a failed credit submit keeps the dialog open and shows the message", async () => {
    render(<Kredit onCredit={async () => "Gagal menyimpan pembelian"} disabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Kredit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Kredit" }));

    await waitFor(() => {
      expect(screen.getByText("Gagal menyimpan pembelian")).toBeTruthy();
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
