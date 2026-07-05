import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
});
