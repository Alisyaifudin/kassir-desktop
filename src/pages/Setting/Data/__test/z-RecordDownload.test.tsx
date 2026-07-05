import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecordDownload } from "../z-RecordDownload";
import { render } from "~/lib/render";

describe("RecordDownload", () => {
  test("renders 'Riwayat' heading and 'Unduh' button", () => {
    render(<RecordDownload onDownload={async () => null} />);
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unduh/i })).toBeInTheDocument();
  });

  test("shows error when download fails", async () => {
    const user = userEvent.setup();
    render(<RecordDownload onDownload={async () => "Gagal mengunduh"} />);
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    expect(await screen.findByText("Gagal mengunduh")).toBeInTheDocument();
  });
});
