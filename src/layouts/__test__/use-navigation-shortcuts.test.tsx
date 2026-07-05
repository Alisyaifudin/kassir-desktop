import { describe, test, expect, mock } from "bun:test";
import { act } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { render as renderRaw, screen } from "@testing-library/react";
import { useNavigationShortcuts } from "../use-navigation-shortcuts";

// Wrapper component that calls the hook and displays current pathname
function TestComponent({
  hideShortcut,
  toggleShortcut,
}: {
  hideShortcut: () => void;
  toggleShortcut: () => void;
}) {
  useNavigationShortcuts(hideShortcut, toggleShortcut);
  const { pathname } = useLocation();
  return <div data-testid="pathname">{pathname}</div>;
}

describe("useNavigationShortcuts", () => {
  test("navigates to /shop on Alt+0", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    // Simulate Alt+0 keydown
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "0", altKey: true, bubbles: true }),
      );
    });

    expect(await screen.findByTestId("pathname")).not.toBeNull();
    expect(screen.getByTestId("pathname").textContent).toBe("/shop");
    expect(hideShortcut).toHaveBeenCalledTimes(1);
  });

  test("navigates to /stock on Alt+1", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "1", altKey: true, bubbles: true }),
      );
    });

    expect(screen.getByTestId("pathname").textContent).toBe("/stock");
  });

  test("navigates to /setting on Alt+4", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "4", altKey: true, bubbles: true }),
      );
    });

    expect(screen.getByTestId("pathname").textContent).toBe("/setting");
  });

  test("ignores unmapped Alt+key combinations", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "9", altKey: true, bubbles: true }),
      );
    });

    // Navigation should not change from "/"
    expect(screen.getByTestId("pathname").textContent).toBe("/");
    expect(hideShortcut).toHaveBeenCalledTimes(0);
  });

  test("toggles shortcut visibility on Alt press", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    // Simulate Alt keydown
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, key: "Alt", bubbles: true }),
      );
    });

    expect(toggleShortcut).toHaveBeenCalledTimes(1);
  });

  test("does not toggle twice on repeated Alt keydown without keyup", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    // Two Alt keydowns without keyup
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, key: "Alt", bubbles: true }),
      );
    });
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, key: "Alt", bubbles: true }),
      );
    });

    // Only toggles once because pressRef prevents repeat
    expect(toggleShortcut).toHaveBeenCalledTimes(1);
  });

  test("toggles again after Alt keyup resets pressRef", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    // First Alt press cycle
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, key: "Alt", bubbles: true }),
      );
    });
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keyup", { altKey: false, key: "Alt", bubbles: true }),
      );
    });

    // Second Alt press cycle
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, key: "Alt", bubbles: true }),
      );
    });

    // Should toggle twice — once per cycle
    expect(toggleShortcut).toHaveBeenCalledTimes(2);
  });

  test("cleans up event listeners on unmount", () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    const { unmount } = renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    unmount();

    // After unmount, Alt+0 should not trigger navigation
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "0", altKey: true, bubbles: true }),
      );
    });

    // hideShortcut should NOT have been called since listeners were removed
    expect(hideShortcut).toHaveBeenCalledTimes(0);
  });

  test("ignores keydown without Alt modifier", async () => {
    const hideShortcut = mock(() => {});
    const toggleShortcut = mock(() => {});

    renderRaw(
      <TestComponent hideShortcut={hideShortcut} toggleShortcut={toggleShortcut} />,
      { wrapper: MemoryRouter },
    );

    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "0", altKey: false, bubbles: true }),
      );
    });

    expect(hideShortcut).toHaveBeenCalledTimes(0);
  });
});
