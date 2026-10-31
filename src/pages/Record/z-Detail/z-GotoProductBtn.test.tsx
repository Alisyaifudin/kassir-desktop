import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { GotoProductBtn } from "./z-GotoProductBtn";

/**
 * The pencil beside a record line opens the product, and the product has to come
 * *back to the records list* — the day, the filters, the search — never to the
 * record it was opened from. Naming `/records/:id` there made `Back` from the
 * product return to the screen the line was read in, so the way out undid itself.
 */

function wrapper(entry: string) {
  return function RouterWrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  };
}

/** The `url_back` the product is given, already decoded. */
function urlBackOf(entry: string): string {
  render(<GotoProductBtn productId="p1" />, { wrapper: wrapper(entry) });
  const href = screen.getByRole("link", { name: "Buka produk" }).getAttribute("href") ?? "";
  expect(href.startsWith("/products/p1?url_back=")).toBe(true);
  return decodeURIComponent(href.slice("/products/p1?url_back=".length));
}

describe("GotoProductBtn", () => {
  test("the record's own way back is the list it was opened from", () => {
    // `/records/:id` carries the listing that picked it; the product inherits it.
    expect(
      urlBackOf(`/records/r1?url_back=${encodeURIComponent("/records?day=1&mode=incoming")}`),
    ).toBe("/records?day=1&mode=incoming");
  });

  test("the record's back survives a detour through the comprehensive search", () => {
    expect(
      urlBackOf(`/records/r1?url_back=${encodeURIComponent("/records/search?query=kopi&page=2")}`),
    ).toBe("/records/search?query=kopi&page=2");
  });

  test("the pane on the list itself names that screen, selection and all", () => {
    expect(urlBackOf("/records?day=1&selected=r1")).toBe("/records?day=1&selected=r1");
  });

  test("a record reached by a bare deep link names the list plainly", () => {
    expect(urlBackOf("/records/r1")).toBe("/records");
  });

  test("an off-app url_back is not forwarded", () => {
    expect(urlBackOf(`/records/r1?url_back=${encodeURIComponent("//evil.com")}`)).toBe("/records");
  });
});
