import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SelectTheme } from "../z-SelectTheme";
import { render } from "~/lib/render";

describe("SelectTheme", () => {
  function renderSelect(opts?: {
    theme?: "light" | "dark" | "system";
    onSetTheme?: (t: "light" | "dark" | "system") => void;
  }) {
    return render(
      <SelectTheme theme={opts?.theme ?? "light"} onSetTheme={opts?.onSetTheme ?? (() => {})} />,
    );
  }

  test("renders 'Tema' label", () => {
    renderSelect();
    expect(screen.getByText("Tema")).toBeInTheDocument();
  });

  test("shows current theme value", () => {
    renderSelect({ theme: "dark" });
    expect(screen.getByText("Gelap")).toBeInTheDocument();
  });

  test("calls onSetTheme when selecting new theme", async () => {
    const onSet = mock((_t: string) => {});
    const user = userEvent.setup();
    renderSelect({ theme: "dark", onSetTheme: onSet });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Terang" }));

    await waitFor(() => expect(onSet).toHaveBeenCalledWith("light"));
  });

  test("select updates displayed value after selection", async () => {
    const user = userEvent.setup();
    render(<StatefulSelectTheme />);

    // Initially shows "Terang"
    expect(screen.getByRole("combobox")).toHaveTextContent("Terang");

    // Select "Gelap"
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Gelap" }));

    // Trigger now shows "Gelap"
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Gelap");
    });
  });
});

function StatefulSelectTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  return <SelectTheme theme={theme} onSetTheme={setTheme} />;
}
