import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecordDownload } from "../z-RecordDownload";
import { render } from "~/lib/render";

describe("RecordDownload", () => {
  function renderBtn(onDownload?: (start: number, end: number) => Promise<string | null>) {
    return render(
      <RecordDownload onDownload={onDownload ?? (() => Promise.resolve(null))} />,
    );
  }

  test("renders 'Riwayat' heading and 'Unduh' button", () => {
    renderBtn();
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unduh/i })).toBeInTheDocument();
  });

  test("calls onDownload when clicked", async () => {
    const onDownload = mock(async (_start: number, _end: number) => null);
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
