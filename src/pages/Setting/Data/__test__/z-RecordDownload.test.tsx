import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Temporal } from "temporal-polyfill";
import { RecordDownload } from "../z-RecordDownload";
import { render } from "~/lib/render";

const today = Temporal.Now.plainDateISO();
const lastMonth = today.subtract({ months: 1 });
const defaultRange: [Temporal.PlainDate, Temporal.PlainDate] = [lastMonth, today];

function renderDownload(onDownload: (start: number, end: number) => Promise<string | null>) {
  return render(
    <RecordDownload onDownload={onDownload} defaultRange={defaultRange} />,
  );
}

describe("RecordDownload", () => {
  test("renders 'Riwayat' heading and 'Unduh' button", () => {
    renderDownload(async () => null);
    expect(screen.getByText("Riwayat")).not.toBeNull();
    expect(screen.getByRole("button", { name: /unduh/i })).not.toBeNull();
  });

  test("shows no error on successful download", async () => {
    const user = userEvent.setup();
    renderDownload(async () => null);
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    expect(screen.queryByText(/gagal/i)).toBeNull();
  });

  test("shows error when download fails", async () => {
    const user = userEvent.setup();
    renderDownload(async () => "Gagal mengunduh");
    await user.click(screen.getByRole("button", { name: /unduh/i }));
    expect(await screen.findByText("Gagal mengunduh")).not.toBeNull();
  });
});
