import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { Effect } from "effect";
import { useDialogLock } from "~/hooks/use-dialog-lock";
import { RouteSync } from "~/services/route/react";
import { route } from "~/services/route/instance";
import { useEscapeBack } from "./use-escape-back";

/**
 * Leaving the product detail with `Esc`.
 *
 * It goes to the screen the detail was entered from, which is the app's own
 * history — the list, the search, the pane, with the query it was left on. That
 * used to be a `url_back` the caller carried, and the difference is the whole
 * point: `url_back` is now only what a screen with *nothing* behind it returns to,
 * because a link can claim a way back that the operator never took.
 *
 * The two reasons to stand down matter as much as the destination: Escape is how a
 * dialog closes and how a combobox drops its list, and neither may take the page
 * with it.
 */

let at = "";

function Probe() {
  const location = useLocation();
  at = `${location.pathname}${location.search}`;
  return null;
}

/**
 * The screens behind the one showing, as the app's own history would hold them:
 * `behind` in the order they were visited, then the screen under test.
 */
function seed(behind: string[], showing: string) {
  const [first, ...rest] = [...behind, showing];
  Effect.runSync(route.reset(first));
  for (const url of rest) {
    Effect.runSync(route.intend(url, "push"));
    Effect.runSync(route.commit({ url, key: url }));
  }
}

function harness({
  showing,
  behind = [],
  lock = false,
}: {
  showing: string;
  behind?: string[];
  lock?: boolean;
}) {
  seed(behind, showing);
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[showing]}>
        {/* The app mounts this at the router's root, so a navigation here has to
            commit to the stack the way the real one does. */}
        <RouteSync />
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
  test("leaves to the screen the detail was entered from", () => {
    harness({ showing: "/products/p1", behind: ["/products?page=3"] });

    expect(escape().defaultPrevented).toBe(true);
    expect(at).toBe("/products?page=3");
  });

  test("a detail with nothing behind it returns to the list", () => {
    harness({ showing: "/products/p1" });

    escape();
    expect(at).toBe("/products");
  });

  test("the second Escape keeps leaving, because the first one popped", () => {
    harness({ showing: "/products/p1", behind: ["/money", "/products"] });

    escape();
    expect(at).toBe("/products");
    escape();
    expect(at).toBe("/money");
  });

  test("an open dialog keeps Escape for itself", () => {
    harness({ showing: "/products/p1", behind: ["/products"], lock: true });

    escape();
    expect(at).toBe("/products/p1");
  });

  test("an Escape something else already handled does not navigate", () => {
    harness({ showing: "/products/p1", behind: ["/products"] });

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    act(() => {
      document.body.dispatchEvent(event);
    });

    expect(at).toBe("/products/p1");
  });

  test("other keys are left alone", () => {
    harness({ showing: "/products/p1", behind: ["/products"] });

    escape({ key: "Enter" });
    expect(at).toBe("/products/p1");
  });
});
