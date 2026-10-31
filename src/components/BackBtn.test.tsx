import { beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { Effect } from "effect";
import { route } from "~/services/route/instance";
import { RouteSync } from "~/services/route/react";
import { BackBtn } from "./BackBtn";

/**
 * `BackBtn` is the button, the stack is the behaviour: it pops to the screen the
 * current one was entered from, and only a screen with nothing behind it uses the
 * fallback it was given.
 */

let at = "";

function Probe() {
  const location = useLocation();
  at = `${location.pathname}${location.search}`;
  return null;
}

/**
 * The screens behind the one showing, in the order they were visited, then the
 * screen under test.
 */
function seed(behind: string[], showing: string) {
  const [first, ...rest] = [...behind, showing];
  Effect.runSync(route.reset(first));
  for (const url of rest) {
    Effect.runSync(route.intend(url, "push"));
    Effect.runSync(route.commit({ url, key: url }));
  }
}

function renderAt(
  showing: string,
  {
    behind = [],
    fallback,
    label,
  }: { behind?: string[]; fallback?: string; label?: string } = {},
) {
  seed(behind, showing);
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[showing]}>
        <RouteSync />
        <Probe />
        {children}
      </MemoryRouter>
    );
  }
  return render(<BackBtn fallback={fallback} label={label} />, { wrapper });
}

beforeEach(() => {
  at = "";
  document.body.innerHTML = "";
});

describe("BackBtn", () => {
  test("returns to the screen this one was entered from", () => {
    renderAt("/products/p1", { behind: ["/products?q=teh"] });

    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

    expect(at).toBe("/products?q=teh");
  });

  test("a second press keeps leaving, because the first one popped", () => {
    renderAt("/products/p1", { behind: ["/money", "/products"] });

    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    expect(at).toBe("/products");

    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    expect(at).toBe("/money");
  });

  test("a screen with nothing behind it goes to the fallback", () => {
    renderAt("/records/r1", { fallback: "/records" });

    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

    expect(at).toBe("/records");
  });

  test("with no fallback given, the home screen is it", () => {
    renderAt("/records/r1");

    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

    expect(at).toBe("/");
  });

  test("the fallback replaces the dead end instead of stacking on it", () => {
    renderAt("/records/r1", { fallback: "/records" });

    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

    // One entry, not two: pressing again leaves the screen rather than bouncing
    // between the dead end and the screen it escaped to.
    expect(Effect.runSync(route.get()).map((entry) => entry.url)).toEqual(["/records"]);
  });

  test("a caller can name it in its own words", () => {
    renderAt("/products/p1", { behind: ["/products"], label: "Kembali ke daftar" });

    // Icon-only, so the name is the only thing a screen reader has to go on.
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kembali ke daftar" }));

    expect(at).toBe("/products");
  });
});
