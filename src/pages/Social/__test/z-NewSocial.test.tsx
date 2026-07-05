import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewSocial } from "../z-NewSocial";
import { render } from "~/lib/render";

function renderNewSocial(onAdd?: (name: string, value: string) => Promise<string | null>) {
  return render(<NewSocial onAdd={onAdd ?? (() => Promise.resolve(null))} />);
}

describe("NewSocial", () => {
  test("renders 'Tambah' trigger button", async () => {
    renderNewSocial();
    expect(await screen.findByRole("button", { name: /tambah/i })).not.toBeNull();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewSocial();
    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("heading", { name: /tambah kontak/i })).not.toBeNull();
  });

  test("dialog contains name and value fields", async () => {
    const user = userEvent.setup();
    renderNewSocial();
    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    expect(screen.getByPlaceholderText("Nama Kontak")).not.toBeNull();
    expect(screen.getByPlaceholderText("Isian Kontak")).not.toBeNull();
  });

  test("shows error when onAdd returns error message", async () => {
    const user = userEvent.setup();
    renderNewSocial(async () => "Nama sudah dipakai");

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Instagram");
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@dup");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("dialog stays open when name is empty (validation blocks submit)", async () => {
    const user = userEvent.setup();
    renderNewSocial();

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@test");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  test("closing dialog with 'Batal' button", async () => {
    const user = userEvent.setup();
    renderNewSocial();

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("dialog closes on successful add", async () => {
    const user = userEvent.setup();
    renderNewSocial();

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Telegram");
    await user.type(screen.getByPlaceholderText("Isian Kontak"), "@test");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("shows validation error when value is empty", async () => {
    const user = userEvent.setup();
    renderNewSocial();

    await user.click(await screen.findByRole("button", { name: /tambah/i }));
    await user.type(screen.getByPlaceholderText("Nama Kontak"), "Test");
    await user.click(screen.getByRole("button", { name: /^tambah$/i }));

    expect(await screen.findByText(/harus ada/i)).not.toBeNull();
  });
});
