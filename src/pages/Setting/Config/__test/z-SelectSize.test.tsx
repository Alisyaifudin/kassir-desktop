import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Size } from "~/services/config";
import { SelectSize } from "../z-SelectSize";
import { render } from "~/lib/render";

describe("SelectSize", () => {
  function renderSelect(opts?: {
    useSize?: () => Size;
    onSetSize?: (s: Size) => void;
  }) {
    return render(
      <SelectSize
        useSize={opts?.useSize ?? (() => "big")}
        onSetSize={opts?.onSetSize ?? (() => {})}
      />,
    );
  }

  test("renders 'Ukuran' label", () => {
    renderSelect();
    expect(screen.getByText("Ukuran")).toBeInTheDocument();
  });

  test("shows current size value", () => {
    renderSelect({ useSize: () => "small" });
    expect(screen.getByText("Kecil")).toBeInTheDocument();
  });

  test("calls onSetSize when selecting new size", async () => {
    const onSet = mock((_s: string) => {});
    const user = userEvent.setup();
    renderSelect({ useSize: () => "big", onSetSize: onSet });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kecil" }));

    await waitFor(() => expect(onSet).toHaveBeenCalledWith("small"));
  });

  test("select updates displayed value after selection", async () => {
    const user = userEvent.setup();
    render(<StatefulSelectSize />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Besar");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kecil" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Kecil");
    });
  });
});

function StatefulSelectSize() {
  const [size, setSize] = useState<Size>("big");
  return <SelectSize useSize={() => size} onSetSize={setSize} />;
}
