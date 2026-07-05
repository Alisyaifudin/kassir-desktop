import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Theme } from "~/services/config";
import { SelectTheme } from "../z-SelectTheme";
import { render } from "~/lib/render";

function StatefulSelectTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  return <SelectTheme useTheme={() => theme} onSetTheme={setTheme} />;
}

describe("SelectTheme", () => {
  function renderSelect(useTheme?: () => Theme, onSetTheme?: (t: Theme) => void) {
    return render(
      <SelectTheme
        useTheme={useTheme ?? (() => "light")}
        onSetTheme={onSetTheme ?? (() => {})}
      />,
    );
  }

  test("renders 'Tema' label", () => {
    renderSelect();
    expect(screen.getByText("Tema")).toBeInTheDocument();
  });

  test("shows 'Terang' when theme is light", () => {
    renderSelect(() => "light");
    expect(screen.getByRole("combobox")).toHaveTextContent("Terang");
  });

  test("shows 'Gelap' when theme is dark", () => {
    renderSelect(() => "dark");
    expect(screen.getByRole("combobox")).toHaveTextContent("Gelap");
  });

  test("updates displayed value after selecting Gelap", async () => {
    const user = userEvent.setup();
    render(<StatefulSelectTheme />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Terang");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Gelap" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Gelap");
    });
  });
});
