import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NameForm } from "../z-NameForm";
import { render } from "~/lib/render";
import { SonnerService } from "~/services/sonner";

const mockSonner: typeof SonnerService.Service = {
  error: mock((message: string) => message),
  success: mock((message: string) => message),
};

function renderNameForm(opts?: {
  pocketId?: string;
  name?: string;
  sonner?: typeof SonnerService.Service;
  onUpdate?: (pocketId: string, name: string) => Promise<string | null>;
}) {
  return render(
    <NameForm
      pocketId={opts?.pocketId ?? "p1"}
      name={opts?.name ?? "Penjualan"}
      sonner={opts?.sonner ?? mockSonner}
      onUpdate={opts?.onUpdate ?? (() => Promise.resolve(null))}
    />,
  );
}

describe("NameForm", () => {
  test("renders input with default name value", () => {
    renderNameForm();
    const input = screen.getByDisplayValue("Penjualan");
    expect(input).not.toBeNull();
  });

  test("clears input and submits new name", async () => {
    const user = userEvent.setup();
    let updated = false;
    renderNameForm({
      onUpdate: async (id, name) => {
        updated = true;
        expect(id).toBe("p1");
        expect(name).toBe("Pendapatan");
        return null;
      },
    });

    const input = screen.getByDisplayValue("Penjualan");
    await user.clear(input);
    await user.type(input, "Pendapatan");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(updated).toBe(true);
    });
  });

  test("shows error toast when name is empty", async () => {
    const user = userEvent.setup();
    renderNameForm();

    const input = screen.getByDisplayValue("Penjualan");
    await user.clear(input);
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockSonner.error).toHaveBeenCalledWith("Harus ada");
    });
  });
});
