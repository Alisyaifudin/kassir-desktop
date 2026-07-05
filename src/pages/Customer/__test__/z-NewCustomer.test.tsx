import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCustomer } from "../z-NewCustomer";
import { render } from "~/lib/render";

function renderNewCustomer(
  onAdd?: (name: string, phone: string) => Promise<string | null>,
) {
  return render(<NewCustomer onAdd={onAdd ?? (() => Promise.resolve(null))} />);
}

describe("NewCustomer", () => {
  test("renders 'Tambah Pelanggan' trigger button", async () => {
    renderNewCustomer();
    expect(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    ).not.toBeNull();
  });

  test("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderNewCustomer();
    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: /tambah pelanggan/i }),
    ).not.toBeNull();
    expect(
      screen.getByText(/tambahkan data pelanggan baru beserta nomor kontak/i),
    ).not.toBeNull();
  });

  test("dialog contains name and phone fields", async () => {
    const user = userEvent.setup();
    renderNewCustomer();
    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    expect(screen.getByPlaceholderText("Nama")).not.toBeNull();
    expect(screen.getByPlaceholderText("No. Hp")).not.toBeNull();
  });

  test("shows error when onAdd returns error message", async () => {
    const user = userEvent.setup();
    renderNewCustomer(async () => "Nama sudah dipakai");

    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    await user.type(screen.getByPlaceholderText("Nama"), "Budi");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("clears error on successful subsequent submit", async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    const onAdd = async (_name: string, _phone: string) => {
      if (shouldFail) {
        shouldFail = false;
        return "Gagal";
      }
      return null;
    };
    renderNewCustomer(onAdd);

    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    await user.type(screen.getByPlaceholderText("Nama"), "Dian");

    // First attempt fails
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));
    expect(await screen.findByText("Gagal")).not.toBeNull();

    // Second attempt succeeds — error disappears, dialog closes
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));
    await waitFor(() => {
      expect(screen.queryByText("Gagal")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("dialog stays open when name is empty (validation blocks submit)", async () => {
    const user = userEvent.setup();
    renderNewCustomer();

    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  test("closing dialog with 'Batal' button", async () => {
    const user = userEvent.setup();
    renderNewCustomer();

    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    expect(await screen.findByRole("dialog")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("dialog closes on successful add", async () => {
    const user = userEvent.setup();
    renderNewCustomer();

    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    await user.type(screen.getByPlaceholderText("Nama"), "Eko");
    await user.type(screen.getByPlaceholderText("No. Hp"), "08123456789");
    await user.click(screen.getByRole("button", { name: /tambahkan/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("pressing Escape closes the dialog", async () => {
    const user = userEvent.setup();
    renderNewCustomer();

    await user.click(
      await screen.findByRole("button", { name: /tambah pelanggan/i }),
    );
    expect(await screen.findByRole("dialog")).not.toBeNull();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
