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

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
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
