import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { useCartQuery, useDraftId } from "./use-cart-query";

/**
 * The cart's own state: which cart is open and which step is showing. The URL is
 * how a screen is *entered* (`?draft=` from a Record, `?stage=` from a shared
 * link, both from a refresh) and where the state is mirrored afterwards; the
 * render depends on the state, so a write cannot be undone by the order two
 * navigations happen to land in.
 */
const STAGES = ["goods", "extras"] as const;

let search = "";
let hash = "";
function Probe() {
  const location = useLocation();
  search = location.search;
  hash = location.hash;
  return null;
}
function harness(entry = "/pos") {
  return renderHook(() => ({ cart: useCartQuery(STAGES), navigate: useNavigate() }), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useCartQuery", () => {
  test("opens on the first stage, with no cart", () => {
    const { result } = harness();
    expect(result.current.cart.stage).toBe("goods");
    expect(result.current.cart.draftId).toBeNull();
  });

  test("reads the step and the cart from the URL", () => {
    const { result } = harness("/pos?stage=extras&draft=d1");
    expect(result.current.cart.stage).toBe("extras");
    expect(result.current.cart.draftId).toBe("d1");
  });

  test("a stage this screen does not have falls back to the first", () => {
    expect(harness("/pos?stage=payment").result.current.cart.stage).toBe("goods");
  });

  test("moving a step writes it and keeps the open cart", () => {
    const { result } = harness("/pos?draft=d1");

    act(() => result.current.cart.setStage("extras"));

    expect(result.current.cart.stage).toBe("extras");
    expect(params().get("stage")).toBe("extras");
    expect(params().get("draft")).toBe("d1");
  });

  test("opening a cart writes its id and keeps the stage", () => {
    const { result } = harness("/pos?stage=extras");

    act(() => result.current.cart.setDraftId("d2"));

    expect(params().get("draft")).toBe("d2");
    expect(params().get("stage")).toBe("extras");
  });

  test("closing the last cart removes the param", () => {
    const { result } = harness("/pos?draft=d1&stage=goods");

    act(() => result.current.cart.setDraftId(null));

    expect(params().has("draft")).toBe(false);
    expect(params().get("stage")).toBe("goods");
  });

  test("a param the cart does not own survives the write", () => {
    const { result } = harness("/pos?url_back=%2Frestock");

    act(() => result.current.cart.setStage("extras"));

    expect(params().get("url_back")).toBe("/restock");
  });

  test("one write per change, not one per render", () => {
    const { result, rerender } = harness("/pos?stage=goods");

    act(() => result.current.cart.setStage("extras"));
    const writes = search;
    rerender();
    rerender();

    expect(search).toBe(writes);
  });
});

/**
 * The stage and the cart used to be written by two hooks over one query string,
 * each rebuilding it from the copy it was handed when it rendered. That is how
 * the goods stage was lost: the completion dialog set `?stage=` back, and the
 * replacement cart's id arrived a tick later and put `?stage=payment` back with
 * it. Both now come from one writer, and the screen reads the state, so the
 * order the two writes land in cannot change what is on screen.
 */
describe("the stage and the cart moving together", () => {
  test("a cart written after the stage moved does not undo the stage", () => {
    const { result } = harness("/pos?stage=goods&draft=d1");
    // The setter a promise is holding: captured a render ago, called a tick later.
    const setDraftId = result.current.cart.setDraftId;

    act(() => result.current.cart.setStage("extras"));
    act(() => setDraftId("d2"));

    expect(result.current.cart.stage).toBe("extras");
    expect(result.current.cart.draftId).toBe("d2");
    expect(params().get("stage")).toBe("extras");
    expect(params().get("draft")).toBe("d2");
  });

  test("both set in one handler still write both params", () => {
    const { result } = harness("/pos?stage=goods&draft=d1");

    act(() => {
      result.current.cart.setStage("extras");
      result.current.cart.setDraftId("d2");
    });

    expect(params().get("stage")).toBe("extras");
    expect(params().get("draft")).toBe("d2");
  });

  test("a navigation the cart did not write does not move it", () => {
    const { result } = harness("/pos?stage=goods&draft=d1");

    // Somebody else owns the address bar for a moment — a link, Back, a repair.
    act(() => result.current.navigate("/pos?stage=extras&draft=d9"));

    expect(result.current.cart.stage).toBe("goods");
    expect(result.current.cart.draftId).toBe("d1");
    expect(hash).toBe("");
  });
});

describe("useDraftId", () => {
  test("no param means no open cart", () => {
    expect(harnessDraft().result.current[0]).toBeNull();
  });

  test("opening a cart writes its id", () => {
    const { result } = harnessDraft("/transaction?stage=goods");
    act(() => result.current[1]("d2"));

    expect(params().get("draft")).toBe("d2");
    // A screen with no stages does not adopt or write one.
    expect(params().get("stage")).toBe("goods");
  });

  test("closing the last cart removes the param", () => {
    const { result } = harnessDraft("/transaction?draft=d1");
    act(() => result.current[1](null));

    expect(params().has("draft")).toBe(false);
  });
});

function harnessDraft(entry = "/transaction") {
  return renderHook(() => useDraftId(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
