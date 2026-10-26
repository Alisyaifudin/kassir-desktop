import { describe, expect, spyOn, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { useId } from "./use-id";

/**
 * The product id the detail pages read. It comes from the route's outlet context,
 * not the URL, so a nested page inherits it without parsing `:id` again — and a
 * route mounted without the context is a wiring mistake that has to throw rather
 * than render against `undefined`.
 */
function Probe() {
  return <span data-testid="id">{useId()}</span>;
}

function renderWith(context: unknown) {
  return render(
    <MemoryRouter initialEntries={["/products/p1"]}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/products/:id" element={<Probe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("useId", () => {
  test("returns the id the route put in the outlet context", () => {
    renderWith({ id: "p1" });
    expect(screen.getByTestId("id").textContent).toBe("p1");
  });

  test("a context without a string id is a wiring error", () => {
    const logged = spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderWith({})).toThrow("No id in the context");

    logged.mockRestore();
  });
});
