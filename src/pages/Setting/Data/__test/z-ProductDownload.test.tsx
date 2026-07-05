import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDownload } from "../z-ProductDownload";
import { render } from "~/lib/render";

describe("ProductDownload", () => {
  function renderBtn(onDownload?: () => Promise<string | null>) {
    return render(<ProductDownload onDownload={onDownload ?? (() => Promise.resolve(null))} />);
  }

  test("renders 'Produk' heading and 'Unduh' button", () => {
    renderBtn();
    expect(screen.getByText("Produk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unduh/i })).toBeInTheDocument();
  });

  test("calls onDownload when clicked", async () => {
    const onDownload = mock(async () => null);
    const user = userEvent.setup();
    renderBtn(onDownload);
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    await waitFor(() => expect(onDownload).toHaveBeenCalled());
  });

  test("shows error when download fails", async () => {
    const onDownload = mock(async () => "Gagal mengunduh");
    const user = userEvent.setup();
    renderBtn(onDownload);
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    expect(await screen.findByText("Gagal mengunduh")).toBeInTheDocument();
  });
});
