import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { Effect } from "effect";
import { route } from "./instance";
import { Link, NavLink, RouteSync, useBack, useNavigate } from "./react";

/**
 * The router side of the stack: that every navigation the app makes is recorded,
 * and that `back` is the traversal the stack promises.
 *
 * The stack is the app's own instance and the router is a memory router, so the
 * two are driven the way the app drives them. Each test starts from a one-screen
 * stack.
 */

const urls = () => Effect.runSync(route.get()).map((entry) => entry.url);

function Screen() {
  const navigate = useNavigate();
  const back = useBack("/fallback");
  const [sideEffects, setSideEffects] = useState(0);
  return (
    <div>
      <span data-testid="side-effects">{sideEffects}</span>
      <Link to="/b">push b</Link>
      <Link to={{ pathname: "/b", search: "?q=1" }} behavior="replace">
        replace with b
      </Link>
      <Link to="/" behavior="root">
        brand home
      </Link>
      <NavLink to="/nav" onClick={() => setSideEffects((count) => count + 1)}>
        nav link
      </NavLink>
      <NavLink
        to="/nav"
        onClick={(event) => {
          setSideEffects((count) => count + 1);
          event.preventDefault();
        }}
      >
        locked nav link
      </NavLink>
      <NavLink to="/nav" behavior="push">
        nav link as a step
      </NavLink>
      <button onClick={() => navigate("/c")}>to c</button>
      <button onClick={() => navigate("/c", { behavior: "replace" })}>replace with c</button>
      <button onClick={() => navigate("/a")}>to a (same screen)</button>
      <button onClick={back}>back</button>
    </div>
  );
}

function renderAt(entry: string) {
  // A previous test's screens are not this test's history: the app's stack is a
  // singleton, so each test starts from the one screen it renders.
  Effect.runSync(route.reset(entry));
  const router = createMemoryRouter(
    [{ path: "/", Component: RouteSync, children: [{ path: "*", Component: Screen }] }],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("the route service behind the router", () => {
  test("the first screen is the stack", async () => {
    renderAt("/a");

    await waitFor(() => expect(urls()).toEqual(["/a"]));
  });

  test("a Link pushes the screen it leads to", async () => {
    const router = renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("push b"));

    await waitFor(() => expect(urls()).toEqual(["/a", "/b"]));
    expect(router.state.location.pathname).toBe("/b");
  });

  test("a Link that says replace rewrites the screen showing", async () => {
    renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("replace with b"));

    // The entry is rewritten, so `Back` leaves the screen instead of walking
    // through the facet that was changed.
    await waitFor(() => expect(urls()).toEqual(["/b?q=1"]));
  });

  test("NavLink is a section, so it collapses the stack to the root", async () => {
    renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("nav link"));

    await waitFor(() => expect(urls()).toEqual(["/", "/nav"]));
  });

  test("navigate pushes unless told otherwise", async () => {
    const router = renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("to c"));

    await waitFor(() => expect(urls()).toEqual(["/a", "/c"]));
    expect(router.state.location.pathname).toBe("/c");
  });

  test("navigate with a replace behaviour rewrites the entry", async () => {
    renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("replace with c"));

    await waitFor(() => expect(urls()).toEqual(["/c"]));
  });

  test("back returns to the screen the stack came from", async () => {
    const router = renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));
    fireEvent.click(screen.getByText("push b"));
    await waitFor(() => expect(urls()).toEqual(["/a", "/b"]));

    fireEvent.click(screen.getByText("back"));

    await waitFor(() => expect(router.state.location.pathname).toBe("/a"));
    // Popped, not pushed: a second `back` must leave the screen, not find it again.
    expect(urls()).toEqual(["/a"]);
  });

  test("back from the only screen in the session falls back to the route", async () => {
    const router = renderAt("/only");
    await waitFor(() => expect(urls()).toEqual(["/only"]));

    fireEvent.click(screen.getByText("back"));

    await waitFor(() => expect(router.state.location.pathname).toBe("/fallback"));
    // The dead end is replaced, so the two screens cannot bounce off each other.
    expect(urls()).toEqual(["/fallback"]);
  });

  test("a root Link to the home screen leaves nothing behind it", async () => {
    // The topbar's brand: home is where the app begins, not another step, so the
    // stack it leaves is one screen.
    Effect.runSync(route.reset("/"));
    for (const url of ["/products", "/products/1"]) {
      Effect.runSync(route.intend(url, "push"));
      Effect.runSync(route.commit({ url, key: url }));
    }
    const router = createMemoryRouter(
      [{ path: "/", Component: RouteSync, children: [{ path: "*", Component: Screen }] }],
      { initialEntries: ["/products/1"] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(urls()).toEqual(["/", "/products", "/products/1"]));

    fireEvent.click(screen.getByText("brand home"));

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(urls()).toEqual(["/"]);
  });

  test("a NavLink's onClick is a side effect, not a replacement", async () => {
    const router = renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("nav link"));

    // Both happened: the caller's effect ran, and the link still navigated.
    await waitFor(() => expect(router.state.location.pathname).toBe("/nav"));
    expect(screen.getByTestId("side-effects").textContent).toBe("1");
    expect(urls()).toEqual(["/", "/nav"]);
  });

  test("a handler that prevents the click opts out of navigating", async () => {
    const router = renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("locked nav link"));

    // The screen that must not be left (a locked receipt dialog) keeps its link
    // inert — and the stack does not remember a navigation that never happened.
    expect(router.state.location.pathname).toBe("/a");
    expect(screen.getByTestId("side-effects").textContent).toBe("1");
    expect(urls()).toEqual(["/a"]);
  });

  test("a NavLink pulls the stack back to the root before it pushes", async () => {
    // The sections hang off home: switching tabs is not a step in a detour.
    Effect.runSync(route.reset("/"));
    for (const url of ["/products", "/products/1"]) {
      Effect.runSync(route.intend(url, "push"));
      Effect.runSync(route.commit({ url, key: url }));
    }
    const router = createMemoryRouter(
      [{ path: "/", Component: RouteSync, children: [{ path: "*", Component: Screen }] }],
      { initialEntries: ["/products/1"] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(urls()).toEqual(["/", "/products", "/products/1"]));

    fireEvent.click(screen.getByText("nav link"));

    await waitFor(() => expect(router.state.location.pathname).toBe("/nav"));
    expect(urls()).toEqual(["/", "/nav"]);
  });

  test("a NavLink can still say it is a step", async () => {
    Effect.runSync(route.reset("/"));
    for (const url of ["/products", "/products/1"]) {
      Effect.runSync(route.intend(url, "push"));
      Effect.runSync(route.commit({ url, key: url }));
    }
    const router = createMemoryRouter(
      [{ path: "/", Component: RouteSync, children: [{ path: "*", Component: Screen }] }],
      { initialEntries: ["/products/1"] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(urls()).toEqual(["/", "/products", "/products/1"]));

    fireEvent.click(screen.getByText("nav link as a step"));

    await waitFor(() => expect(router.state.location.pathname).toBe("/nav"));
    expect(urls()).toEqual(["/", "/products", "/products/1", "/nav"]);
  });

  test("a webview pop truncates instead of recording a screen", async () => {
    // The 46 navigations still written through react-router push real history
    // entries, so the webview can move on its own. That pop is a traversal.
    const router = createMemoryRouter(
      [{ path: "/", Component: RouteSync, children: [{ path: "*", Component: Screen }] }],
      { initialEntries: ["/a", "/b"], initialIndex: 1 },
    );
    Effect.runSync(route.reset("/a"));
    Effect.runSync(route.intend("/b", "push"));
    Effect.runSync(route.commit({ url: "/b", key: "seeded" }));
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(urls()).toEqual(["/a", "/b"]));
    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => expect(router.state.location.pathname).toBe("/a"));
    expect(urls()).toEqual(["/a"]);
  });

  test("navigating to the screen showing is not a navigation", async () => {
    const router = renderAt("/a");
    await waitFor(() => expect(urls()).toEqual(["/a"]));

    fireEvent.click(screen.getByText("to a (same screen)"));

    // A second identical entry would be a back step the operator cannot see.
    await waitFor(() => expect(router.state.location.pathname).toBe("/a"));
    expect(urls()).toEqual(["/a"]);
  });
});
