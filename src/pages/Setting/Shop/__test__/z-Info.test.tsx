import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShopInfo } from "../z-Info";
import { render } from "~/lib/render";
import type { Info } from "~/services/info";

const mockInfo: Info = {
  name: "Toko Kita",
  address: "Jl. Merdeka 123",
  header: "Selamat Datang",
  footer: "Terima Kasih",
};

describe("ShopInfo", () => {
  test("renders form fields with current values", () => {
    render(<ShopInfo info={mockInfo} onSetInfo={async () => null} />);
    expect(screen.getByDisplayValue("Toko Kita")).not.toBeNull();
    expect(screen.getByDisplayValue("Jl. Merdeka 123")).not.toBeNull();
    expect(screen.getByDisplayValue("Selamat Datang")).not.toBeNull();
    expect(screen.getByDisplayValue("Terima Kasih")).not.toBeNull();
  });

  test("renders 'Simpan' button", () => {
    render(<ShopInfo info={mockInfo} onSetInfo={async () => null} />);
    expect(screen.getByRole("button", { name: /simpan/i })).not.toBeNull();
  });

  test("shows error when save fails", async () => {
    const user = userEvent.setup();
    render(<ShopInfo info={mockInfo} onSetInfo={async () => "Gagal menyimpan"} />);
    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText("Gagal menyimpan")).not.toBeNull();
  });
});
