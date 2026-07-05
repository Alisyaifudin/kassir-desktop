import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
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
  function renderForm(opts?: {
    info?: Info;
    onSetInfo?: (info: Info) => Promise<string | null>;
  }) {
    return render(
      <ShopInfo
        info={opts?.info ?? mockInfo}
        onSetInfo={opts?.onSetInfo ?? (() => Promise.resolve(null))}
      />,
    );
  }

  test("renders form fields with current values", () => {
    renderForm();
    expect(screen.getByDisplayValue("Toko Kita")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jl. Merdeka 123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Selamat Datang")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Terima Kasih")).toBeInTheDocument();
  });

  test("renders 'Simpan' button", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /simpan/i })).toBeInTheDocument();
  });

  test("calls onSetInfo with updated values on submit", async () => {
    const onSet = mock(async (_info: Info) => null);
    const user = userEvent.setup();
    renderForm({ onSetInfo: onSet });

    const nameInput = screen.getByDisplayValue("Toko Kita");
    await user.clear(nameInput);
    await user.type(nameInput, "Toko Baru");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onSet).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Toko Baru" }),
      );
    });
  });

  test("shows error when set fails", async () => {
    const onSet = mock(async () => "Gagal menyimpan");
    const user = userEvent.setup();
    renderForm({ onSetInfo: onSet });

    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument();
  });
});
