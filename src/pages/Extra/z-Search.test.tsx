import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Search } from "./z-Search";

/**
 * The Extra page's search takes the cursor as the page appears — it has since
 * before the product page's did, and the two are meant to behave alike: arriving
 * on a page whose only job is "find a thing" should not need a click first.
 */
function renderSearch(entry = "/extras") {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Search />
    </MemoryRouter>,
  );
  return screen.getByPlaceholderText("Cari...") as HTMLInputElement;
}

describe("extra search", () => {
  test("takes the cursor on mount, without a click", () => {
    const field = renderSearch();

    expect(document.activeElement).toBe(field);
  });

  test("a query already in the URL does not stop the cursor from landing", () => {
    const field = renderSearch("/extras?query=ongkos");

    expect(field.value).toBe("ongkos");
    expect(document.activeElement).toBe(field);
  });
});
