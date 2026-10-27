import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { useDialogLock } from "~/hooks/use-dialog-lock";
import { useEscapeBack } from "./use-escape-back";

/**
 * Leaving the product detail with `Esc`.
 *
 * Two destinations, and which one it picks is the whole point: `url_back` when
 * the tab strip carried one, the router's own history when it did not — pushing
 * `/products` there would leave `Back` pointing at the screen it just left.
 *
 * The two reasons to stand down matter as much as the two destinations: Escape
 * is how a dialog closes and how a combobox drops its list, and neither may take
 * the page with it.
 */

let at = "";

function Probe() {
  const location = useLocation();
  at = `${location.pathname}${location.search}`;
  return null;
}

function harness({
  entries,
  lock = false,
}: {
  entries: string[];
  lock?: boolean;
}) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Probe />
        {children}
      </MemoryRouter>
    );
  }
  return renderHook(
    () => {
      if (lock) useDialogLock(true);
      useEscapeBack();
    },
    { wrapper },
  );
}

function escape(init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    document.body.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  at = "";
  document.body.innerHTML = "";
});

describe("useEscapeBack", () => {
  test("goes to url_back when the screen carried one", () => {
    harness({ entries: ["/products", "/products/p1?url_back=%2Fmoney%3Fpage%3D2"] });

    expect(escape().defaultPrevented).toBe(true);
    expect(at).toBe("/money?page=2");
  });

  test("walks back through history when it did not", () => {
    harness({ entries: ["/products?page=3", "/products/p1"] });

    escape();
    expect(at).toBe("/products?page=3");
  });

  test("an open dialog keeps Escape for itself", () => {
    harness({ entries: ["/products", "/products/p1?url_back=%2Fmoney"], lock: true });

    escape();
    expect(at).toBe("/products/p1?url_back=%2Fmoney");
  });

  test("an Escape something else already handled does not navigate", () => {
    harness({ entries: ["/products", "/products/p1?url_back=%2Fmoney"] });

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    act(() => {
      document.body.dispatchEvent(event);
    });

    expect(at).toBe("/products/p1?url_back=%2Fmoney");
  });

  test("other keys are left alone", () => {
    harness({ entries: ["/products", "/products/p1?url_back=%2Fmoney"] });

    escape({ key: "Enter" });
    expect(at).toBe("/products/p1?url_back=%2Fmoney");
  });
});
