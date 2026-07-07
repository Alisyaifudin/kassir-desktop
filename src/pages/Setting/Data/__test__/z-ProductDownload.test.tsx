import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDownload } from "../z-ProductDownload";
import { render } from "~/lib/render";

describe("ProductDownload", () => {
  test("renders 'Produk' heading and 'Unduh' button", () => {
    render(<ProductDownload onDownload={async () => null} />);
    expect(screen.getByText("Produk")).not.toBeNull();
    expect(screen.getByRole("button", { name: /unduh/i })).not.toBeNull();
  });

  test("shows no error on successful download", async () => {
    const user = userEvent.setup();
    render(<ProductDownload onDownload={async () => null} />);
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    expect(screen.queryByText(/gagal/i)).toBeNull();
  });

  test("shows error when download fails", async () => {
    const user = userEvent.setup();
    render(<ProductDownload onDownload={async () => "Gagal mengunduh"} />);
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    expect(await screen.findByText("Gagal mengunduh")).not.toBeNull();
  });
});
