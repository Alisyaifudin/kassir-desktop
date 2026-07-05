import { describe, test, expect } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteRecord } from "../z-DeleteRecord";
import { render } from "~/lib/render";
import type { Money } from "~/services/money/type";

const mockMoney: Money = {
  id: "m1",
  timestamp: 1700000000000,
  value: 100000,
  pocketId: "p1",
  note: "Penjualan",
  diff: 0,
  updatedAt: 1700000000000,
};

function renderDeleteRecord(opts?: {
  money?: Money;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  return render(
    <DeleteRecord
      money={opts?.money ?? mockMoney}
      onDelete={opts?.onDelete ?? (() => Promise.resolve(null))}
    />,
  );
}

describe("DeleteRecord", () => {
  test("renders delete trigger button", () => {
    renderDeleteRecord();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  test("opens confirmation dialog", async () => {
    const user = userEvent.setup();
    renderDeleteRecord();

    await user.click(screen.getAllByRole("button")[0]);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: /hapus catatan/i }),
    ).not.toBeNull();
  });

  test("dialog shows money details", async () => {
    const user = userEvent.setup();
    renderDeleteRecord();

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => screen.getByRole("dialog"));

    // Should show value and note
    expect(screen.getByText(/penjualan/i)).not.toBeNull();
    expect(screen.getByText(/100\.?000/)).not.toBeNull();
  });

  test("closes on successful delete", async () => {
    const user = userEvent.setup();
    renderDeleteRecord();

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => screen.getByRole("dialog"));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("shows error when delete fails", async () => {
    const user = userEvent.setup();
    renderDeleteRecord({ onDelete: async () => "Gagal menghapus" });

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => screen.getByRole("dialog"));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    expect(await screen.findByText("Gagal menghapus")).not.toBeNull();
    expect(screen.getByRole("dialog")).not.toBeNull();
  });
});
