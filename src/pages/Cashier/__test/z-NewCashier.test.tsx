import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCashier } from "../z-NewCashier";
import { render } from "~/lib/render";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNewCashier(onAdd?: (name: string) => Promise<string | null>) {
  return render(
    <NewCashier onAdd={onAdd ?? (() => Promise.resolve(null))} />,
  );
}

// ---------------------------------------------------------------------------
// Tests — pure component, no Effect
// ---------------------------------------------------------------------------

describe("NewCashier", () => {
  test("renders 'Tambah Kasir' trigger button", async () => {
    renderNewCashier();
    expect(await screen.findByRole("button", { name: /tambah kasir/i })).toBeInTheDocument();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewCashier();
    const trigger = await screen.findByRole("button", { name: /tambah kasir/i });
    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /tambah kasir/i })).toBeInTheDocument();
  });

  test("dialog contains a name form field", async () => {
    const user = userEvent.setup();
    renderNewCashier();
    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });

  test("submitting form calls onAdd with name", async () => {
    const onAdd = mock(async (_name: string) => null);
    const user = userEvent.setup();
    renderNewCashier(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    const input = screen.getByRole("textbox");
    await user.type(input, "Dian");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("Dian");
    });
  });

  test("shows error when onAdd returns error message", async () => {
    const onAdd = mock(async (_name: string) => "Nama sudah dipakai");
    const user = userEvent.setup();
    renderNewCashier(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    await user.type(screen.getByRole("textbox"), "Budi");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).toBeInTheDocument();
  });

  test("closing dialog with 'Batal' button", async () => {
    const user = userEvent.setup();
    renderNewCashier();

    await user.click(await screen.findByRole("button", { name: /tambah kasir/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
