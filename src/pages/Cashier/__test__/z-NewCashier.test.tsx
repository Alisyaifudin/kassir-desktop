import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCashier } from "../z-NewCashier";
import { render } from "~/lib/render";

function renderNewCashier(onAdd?: (name: string) => Promise<string | null>) {
  return render(<NewCashier onAdd={onAdd ?? (() => Promise.resolve(null))} />);
}

describe("NewCashier", () => {
  test("renders 'Tambah Kasir' trigger button", async () => {
    renderNewCashier();
    expect(await screen.findByRole("button", { name: /tambah kasir/i })).not.toBeNull();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewCashier();
    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("heading", { name: /tambah kasir/i })).not.toBeNull();
    expect(screen.getByText(/buat akun kasir baru dengan peran user/i)).not.toBeNull();
  });

  test("dialog contains a name form field", async () => {
    const user = userEvent.setup();
    renderNewCashier();
    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    expect(await screen.findByRole("textbox")).not.toBeNull();
  });

  test("shows error when onAdd returns error message", async () => {
    const user = userEvent.setup();
    renderNewCashier(async () => "Nama sudah dipakai");

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    await user.type(screen.getByRole("textbox"), "Budi");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("clears error on successful subsequent submit", async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    const onAdd = async (_name: string) => {
      if (shouldFail) {
        shouldFail = false;
        return "Gagal";
      }
      return null;
    };
    renderNewCashier(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    await user.type(screen.getByRole("textbox"), "Dian");

    // First attempt fails
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));
    expect(await screen.findByText("Gagal")).not.toBeNull();

    // Second attempt succeeds — error should disappear
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));
    await waitFor(() => {
      expect(screen.queryByText("Gagal")).toBeNull();
    });
  });

  test("dialog stays open when name is empty (validation blocks submit)", async () => {
    const user = userEvent.setup();
    renderNewCashier();

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  test("closing dialog with 'Batal' button", async () => {
    const user = userEvent.setup();
    renderNewCashier();

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("pressing Escape closes the dialog", async () => {
    const user = userEvent.setup();
    renderNewCashier();

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
