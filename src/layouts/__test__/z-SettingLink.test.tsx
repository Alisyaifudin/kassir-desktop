import { describe, test, expect, mock } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { render as renderRaw } from "@testing-library/react";
import { SettingLink } from "../z-SettingLink";

describe("SettingLink", () => {
  function renderAt(path: string, showShortcut = false) {
    return renderRaw(
      <SettingLink
        useShowShortcut={() => showShortcut}
        hideShortcut={() => {}}
      />,
      { wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> },
    );
  }

  test("renders a Settings button", async () => {
    renderAt("/");
    const btn = await screen.findByRole("button");
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  test("has active styling when on /setting page", async () => {
    renderAt("/setting");
    const btn = await screen.findByRole("button");
    expect(btn.className).toContain("bg-white/80");
  });

  test("has default styling when not on /setting page", async () => {
    renderAt("/");
    const btn = await screen.findByRole("button");
    expect(btn.className).not.toContain("bg-white/80");
  });

  test("shows Kbd 'alt+4' when useShowShortcut returns true", async () => {
    renderAt("/", true);
    const kbd = document.querySelector("kbd");
    expect(kbd).not.toBeNull();
    expect(kbd?.className).not.toContain("hidden");
    expect(kbd?.textContent).toBe("alt+4");
  });

  test("hides Kbd when useShowShortcut returns false", async () => {
    renderAt("/", false);
    const kbd = document.querySelector("kbd");
    expect(kbd?.className).toContain("hidden");
  });

  test("calls hideShortcut on click", async () => {
    const user = userEvent.setup();
    const hideShortcut = mock(() => {});
    renderRaw(
      <SettingLink useShowShortcut={() => false} hideShortcut={hideShortcut} />,
      { wrapper: MemoryRouter },
    );

    await user.click(await screen.findByRole("button"));
    expect(hideShortcut).toHaveBeenCalledTimes(1);
  });
});
