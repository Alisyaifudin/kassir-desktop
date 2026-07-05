import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Size } from "~/services/config";
import { SelectSize } from "../z-SelectSize";
import { render } from "~/lib/render";

class 

function StatefulSelectSize() {
  const [size, setSize] = useState<Size>("big");
  return <SelectSize useSize={() => size} onSetSize={setSize} />;
}

describe("SelectSize", () => {
  function renderSelect(useSize?: () => Size, onSetSize?: (s: Size) => void) {
    return render(
      <SelectSize
        useSize={useSize ?? (() => "big")}
        onSetSize={onSetSize ?? (() => {})}
      />,
    );
  }

  test("renders 'Ukuran' label", () => {
    renderSelect();
    expect(screen.getByText("Ukuran")).toBeInTheDocument();
  });

  test("shows 'Besar' when size is big", () => {
    renderSelect(() => "big");
    expect(screen.getByRole("combobox")).toHaveTextContent("Besar");
  });

  test("shows 'Kecil' when size is small", () => {
    renderSelect(() => "small");
    expect(screen.getByRole("combobox")).toHaveTextContent("Kecil");
  });

  test("updates displayed value after selecting Kecil", async () => {
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
