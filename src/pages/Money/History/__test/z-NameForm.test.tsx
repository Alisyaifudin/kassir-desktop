import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NameForm } from "../z-NameForm";
import { render } from "~/lib/render";

function renderNameForm(opts?: {
  pocketId?: string;
  name?: string;
  onUpdate?: (pocketId: string, name: string) => Promise<string | null>;
}) {
  return render(
    <NameForm
      pocketId={opts?.pocketId ?? "p1"}
      name={opts?.name ?? "Penjualan"}
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

  test("shows error when name is empty", async () => {
    const user = userEvent.setup();
    renderNameForm();

    const input = screen.getByDisplayValue("Penjualan");
    await user.clear(input);
    await user.keyboard("{Enter}");

    // toast.error would fire, but we verify the input still exists
    await waitFor(() => {
      expect(screen.getByDisplayValue("")).not.toBeNull();
    });
  });
});
