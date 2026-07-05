import { describe, test, expect } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletePocket } from "../z-DeletePocket";
import { render } from "~/lib/render";

function renderDeletePocket(opts?: {
  pocketId?: string;
  onDelete?: (pocketId: string) => Promise<string | null>;
}) {
  return render(
    <DeletePocket
      pocketId={opts?.pocketId ?? "p1"}
      onDelete={opts?.onDelete ?? (() => Promise.resolve(null))}
    />,
  );
}

describe("DeletePocket", () => {
  test("renders 'Hapus Kantong' button", () => {
    renderDeletePocket();
    expect(
      screen.getByRole("button", { name: /hapus kantong/i }),
    ).not.toBeNull();
  });

  test("opens confirmation dialog", async () => {
    const user = userEvent.setup();
    renderDeletePocket();

    await user.click(screen.getByRole("button", { name: /hapus kantong/i }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: /hapus kantong/i }),
    ).not.toBeNull();
    expect(
      within(dialog).getByText(/semua catatan keuangan.*terhapus selamanya/i),
    ).not.toBeNull();
  });

  test("shows error when delete fails", async () => {
    const user = userEvent.setup();
    renderDeletePocket({ onDelete: async () => "Gagal menghapus" });

    await user.click(screen.getByRole("button", { name: /hapus kantong/i }));
    await waitFor(() => screen.getByRole("dialog"));
    await user.click(screen.getByRole("button", { name: /^hapus$/i }));

    expect(await screen.findByText("Gagal menghapus")).not.toBeNull();
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  test("closes with 'Batalkan' button", async () => {
    const user = userEvent.setup();
    renderDeletePocket();

    await user.click(screen.getByRole("button", { name: /hapus kantong/i }));
    await waitFor(() => screen.getByRole("dialog"));
    await user.click(screen.getByRole("button", { name: /batalkan/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
