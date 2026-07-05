import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SelectSize } from "../z-SelectSize";
import { render } from "~/lib/render";

describe("SelectSize", () => {
  function renderSelect(opts?: { size?: "big" | "small"; onSetSize?: (s: "big" | "small") => void }) {
    return render(
      <SelectSize size={opts?.size ?? "big"} onSetSize={opts?.onSetSize ?? (() => {})} />,
    );
  }

  test("renders 'Ukuran' label", () => {
    renderSelect();
    expect(screen.getByText("Ukuran")).toBeInTheDocument();
  });

  test("shows current size value", () => {
    renderSelect({ size: "small" });
    expect(screen.getByText("Kecil")).toBeInTheDocument();
  });

  test("calls onSetSize when selecting new size", async () => {
    const onSet = mock((_s: string) => {});
    const user = userEvent.setup();
    renderSelect({ size: "big", onSetSize: onSet });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kecil" }));

    await waitFor(() => expect(onSet).toHaveBeenCalledWith("small"));
  });

  test("select updates displayed value after selection", async () => {
    const user = userEvent.setup();
    render(<StatefulSelectSize />);

    // Initially shows "Besar"
    expect(screen.getByRole("combobox")).toHaveTextContent("Besar");

    // Select "Kecil"
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kecil" }));

    // Trigger now shows "Kecil"
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Kecil");
    });
  });
});

function StatefulSelectSize() {
  const [size, setSize] = useState<"big" | "small">("big");
  return <SelectSize size={size} onSetSize={setSize} />;
}
