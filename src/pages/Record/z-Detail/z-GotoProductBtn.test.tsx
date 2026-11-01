import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { Effect } from "effect";
import { route } from "~/services/route/instance";
import { RouteSync } from "~/services/route/react";
import { GotoProductBtn } from "./z-GotoProductBtn";

/**
 * The pencil beside a record line opens the product.
 *
 * It used to be the hard part of the screen: the product's way back had to be
 * named *here*, and it had to be the records list rather than the record the line
 * was read in — so the component recovered a `url_back`, guarded against
 * `/` and off-app values, and re-encoded it into the link. Now the product is
 * simply a step: it is pushed onto the app's own stack, and `Back` walks the hops
 * the operator actually took.
 */

let at = "";

function Probe() {
  const location = useLocation();
  at = `${location.pathname}${location.search}`;
  return null;
}

/** The screens behind the record, then the record itself. */
function seed(behind: string[], showing: string) {
  const [first, ...rest] = [...behind, showing];
  Effect.runSync(route.reset(first));
  for (const url of rest) {
    Effect.runSync(route.intend(url, "push"));
    Effect.runSync(route.commit({ url, key: url }));
  }
}

function renderAt(showing: string, behind: string[] = []) {
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
  return render(<GotoProductBtn productId="p1" />, { wrapper });
}

const urls = () => Effect.runSync(route.get()).map((entry) => entry.url);

describe("GotoProductBtn", () => {
  test("the link is the product, and nothing else", () => {
    renderAt("/records/r1");

    // No `url_back`: the way back is the stack's, not this link's to name.
    expect(screen.getByRole("link", { name: "Buka produk" }).getAttribute("href")).toBe(
      "/products/p1",
    );
  });

  test("opening the product is a step off the record", async () => {
    renderAt("/records/r1", ["/records?day=1&mode=incoming"]);
    await waitFor(() => expect(urls()).toEqual(["/records?day=1&mode=incoming", "/records/r1"]));

    fireEvent.click(screen.getByRole("link", { name: "Buka produk" }));

    await waitFor(() => expect(at).toBe("/products/p1"));
    // Record → product, and the list is still behind both.
    expect(urls()).toEqual(["/records?day=1&mode=incoming", "/records/r1", "/products/p1"]);
  });

  test("a record reached by a deep link still has one screen behind the product", async () => {
    renderAt("/records/r1");
    await waitFor(() => expect(urls()).toEqual(["/records/r1"]));

    fireEvent.click(screen.getByRole("link", { name: "Buka produk" }));

    await waitFor(() => expect(urls()).toEqual(["/records/r1", "/products/p1"]));
  });

  test("no product, no link", () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <MemoryRouter initialEntries={["/records/r1"]}>{children}</MemoryRouter>;
    }
    render(<GotoProductBtn productId={undefined} />, { wrapper });

    expect(screen.queryByRole("link", { name: "Buka produk" })).toBeNull();
  });
});
