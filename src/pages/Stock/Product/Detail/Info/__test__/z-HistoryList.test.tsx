import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryList } from "../z-HistoryList";
import type { HistoryEvent } from "~/services/product/type";
import { render } from "~/lib/render";

const mockEvents: HistoryEvent[] = [
  { id: "1", timestamp: Date.now() - 86400000, note: "Penjualan pagi", value: 5 },
  { id: "2", timestamp: Date.now() - 172800000, note: "Pembelian stok", value: -10 },
  { id: "3", timestamp: Date.now() - 259200000, note: "Retur", value: -2 },
];

function renderList(events: HistoryEvent[]) {
  return render(<HistoryList events={events} />);
}

describe("HistoryList", () => {
  test("shows empty message when no events", async () => {
    renderList([]);
    expect(await screen.findByText(/tidak ada riwayat/i)).not.toBeNull();
  });

  test("renders event cards", async () => {
    renderList(mockEvents);
    expect(await screen.findByText("Penjualan pagi")).not.toBeNull();
    expect(screen.getByText("Pembelian stok")).not.toBeNull();
  });

  test("shows positive values with + prefix", async () => {
    renderList(mockEvents);
    expect(await screen.findByText("+5")).not.toBeNull();
  });

  test("shows negative values without prefix", async () => {
    renderList(mockEvents);
    expect(await screen.findByText("-10")).not.toBeNull();
  });

  // ── Filter buttons ──────────────────────────────────────────

  test("filter buttons are present", () => {
    renderList(mockEvents);
    expect(screen.getByRole("button", { name: "Semua" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Masuk" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Keluar" })).not.toBeNull();
  });

  test("filtering by 'Masuk' shows only positive events", async () => {
    const user = userEvent.setup();
    renderList(mockEvents);

    await user.click(screen.getByRole("button", { name: "Masuk" }));

    // Only positive event (value 5) remains visible
    expect(await screen.findByText("+5")).not.toBeNull();
    expect(screen.queryByText("Pembelian stok")).toBeNull();
  });

  test("filtering by 'Keluar' shows only negative events", async () => {
    const user = userEvent.setup();
    renderList(mockEvents);

    await user.click(screen.getByRole("button", { name: "Keluar" }));

    expect(await screen.findByText("-10")).not.toBeNull();
    expect(screen.queryByText("Penjualan pagi")).toBeNull();
  });
});
