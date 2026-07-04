import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewSocial } from "../z-NewSocial";
import { render } from "~/lib/render";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNewSocial(onAdd?: (name: string, value: string) => Promise<string | null>) {
  return render(<NewSocial onAdd={onAdd ?? (() => Promise.resolve(null))} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NewSocial", () => {
  test("renders 'Tambah' trigger button", async () => {
    renderNewSocial();
    expect(await screen.findByRole("button", { name: /tambah/i })).toBeInTheDocument();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewSocial();
    const trigger = await screen.findByRole("button", { name: /tambah/i });
    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /tambah kontak/i })).toBeInTheDocument();
  });

  test("dialog contains name and value fields", async () => {
    const user = userEvent.setup();
    renderNewSocial();
    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    expect(screen.getByPlaceholderText("Nama Kontak")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Isian Kontak")).toBeInTheDocument();
  });

  test("submitting form calls onAdd with name and value", async () => {
    const onAdd = mock(async (_name: string, _value: string) => null);
    const user = userEvent.setup();
    renderNewSocial(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Telegram");
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@tokokita");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("Telegram", "@tokokita");
    });
  });

  test("shows error when onAdd returns error message", async () => {
    const onAdd = mock(async (_name: string, _value: string) => "Nama sudah dipakai");
    const user = userEvent.setup();
    renderNewSocial(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Instagram");
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@dup");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    expect(await screen.findByText("Nama sudah dipakai")).toBeInTheDocument();
  });

  test("does not call onAdd when name is empty (validation blocks submit)", async () => {
    const onAdd = mock(async (_name: string, _value: string) => null);
    const user = userEvent.setup();
    renderNewSocial(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@test");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("closing dialog with 'Batal' button", async () => {
    const user = userEvent.setup();
    renderNewSocial();

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("closes dialog on successful add", async () => {
    const onAdd = mock(async (_name: string, _value: string) => null);
    const user = userEvent.setup();
    renderNewSocial(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Telegram");
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@test");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("shows validation error when value is empty", async () => {
    const user = userEvent.setup();
    renderNewSocial();

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Test");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    expect(await screen.findByText(/harus ada/i)).toBeInTheDocument();
  });
});
