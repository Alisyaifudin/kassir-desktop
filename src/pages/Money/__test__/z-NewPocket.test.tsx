import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewPocket } from "../z-NewPocket";
import { render } from "~/lib/render";

function renderNewPocket(onAdd?: (name: string) => Promise<string | null>) {
  return render(<NewPocket onAdd={onAdd ?? (() => Promise.resolve(null))} />);
}

describe("NewPocket", () => {
  test("renders 'Kantong Baru' trigger button", async () => {
    renderNewPocket();
    expect(await screen.findByRole("button", { name: /kantong baru/i })).not.toBeNull();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewPocket();
    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("heading", { name: /tambah kantong keuangan baru/i })).not.toBeNull();
  });

  test("dialog contains name field", async () => {
    const user = userEvent.setup();
    renderNewPocket();
    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    expect(screen.getByLabelText("Nama")).not.toBeNull();
  });

  test("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    renderNewPocket();

    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    await user.click(screen.getByRole("button", { name: /tambah/i }));

    // Zod validation error via TextError
    expect(await screen.findByText(/tidak boleh kosong/i)).not.toBeNull();
  });

  test("shows validation error when name exceeds 20 chars", async () => {
    const user = userEvent.setup();
    renderNewPocket();

    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    await user.type(
      screen.getByLabelText("Nama"),
      "Nama yang sangat panjang sekali lebih dari dua puluh",
    );
    await user.click(screen.getByRole("button", { name: /tambah/i }));

    expect(await screen.findByText(/maksimal 20 karakter/i)).not.toBeNull();
  });

  test("shows error when onAdd returns error", async () => {
    const user = userEvent.setup();
    renderNewPocket(async () => "Nama sudah dipakai");

    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    await user.type(screen.getByLabelText("Nama"), "Penjualan");
    await user.click(screen.getByRole("button", { name: /tambah/i }));

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("dialog closes on successful add", async () => {
    const user = userEvent.setup();
    renderNewPocket();

    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    await user.type(screen.getByLabelText("Nama"), "Tabungan");
    await user.click(screen.getByRole("button", { name: /tambah/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("pressing Escape closes the dialog", async () => {
    const user = userEvent.setup();
    renderNewPocket();

    await user.click(await screen.findByRole("button", { name: /kantong baru/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
