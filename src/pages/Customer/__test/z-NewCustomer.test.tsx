import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCustomer } from "../z-NewCustomer";
import { render } from "~/lib/render";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNewCustomer(onAdd?: (name: string, phone: string) => Promise<string | null>) {
  return render(
    <NewCustomer onAdd={onAdd ?? (() => Promise.resolve(null))} />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NewCustomer", () => {
  test("renders 'Tambah Pelanggan' trigger button", async () => {
    renderNewCustomer();
    expect(await screen.findByRole("button", { name: /tambah pelanggan/i })).toBeInTheDocument();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewCustomer();
    const trigger = await screen.findByRole("button", { name: /tambah pelanggan/i });
    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /tambah pelanggan/i })).toBeInTheDocument();
  });

  test("dialog has description text", async () => {
    const user = userEvent.setup();
    renderNewCustomer();
    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    expect(
      screen.getByText(/tambahkan data pelanggan baru beserta nomor kontak/i),
    ).toBeInTheDocument();
  });

  test("dialog contains name and phone fields", async () => {
    const user = userEvent.setup();
    renderNewCustomer();
    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    expect(screen.getByPlaceholderText("Nama")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("No. Hp")).toBeInTheDocument();
  });

  test("submitting form calls onAdd with name and phone", async () => {
    const onAdd = mock(async (_name: string, _phone: string) => null);
    const user = userEvent.setup();
    renderNewCustomer(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    await user.type(screen.getByPlaceholderText("Nama"), "Dian");
    await user.type(screen.getByPlaceholderText("No. Hp"), "081111222333");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("Dian", "081111222333");
    });
  });

  test("shows error when onAdd returns error message", async () => {
    const onAdd = mock(async (_name: string, _phone: string) => "Nama sudah dipakai");
    const user = userEvent.setup();
    renderNewCustomer(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    await user.type(screen.getByPlaceholderText("Nama"), "Budi");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).toBeInTheDocument();
  });

  test("does not call onAdd when name is empty (validation blocks submit)", async () => {
    const onAdd = mock(async (_name: string, _phone: string) => null);
    const user = userEvent.setup();
    renderNewCustomer(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    // Validation should prevent onAdd from being called
    expect(onAdd).not.toHaveBeenCalled();
    // Dialog stays open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("closing dialog with 'Batal' button", async () => {
    const user = userEvent.setup();
    renderNewCustomer();

    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("closes dialog on successful add", async () => {
    const onAdd = mock(async (_name: string, _phone: string) => null);
    const user = userEvent.setup();
    renderNewCustomer(onAdd);

    await user.click(await screen.findByRole("button", { name: /tambah pelanggan/i }));
    await user.type(screen.getByPlaceholderText("Nama"), "Eko");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
