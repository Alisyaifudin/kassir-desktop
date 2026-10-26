import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useDraftId } from "./use-draft";

/**
 * The open cart tab, in the URL so a refresh or a shared link lands on the same
 * tab. Clearing it is a delete, not an empty param — `?draft=` would name a cart
 * with no id.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/pos") {
  return renderHook(() => useDraftId(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useDraftId", () => {
  test("no param means no open cart", () => {
    expect(harness().result.current[0]).toBeNull();
  });

  test("reads the open cart from the URL", () => {
    expect(harness("/pos?draft=d1").result.current[0]).toBe("d1");
  });

  test("opening a tab writes its id and keeps the stage", () => {
    const { result } = harness("/pos?stage=extras");

    act(() => result.current[1]("d2"));

    expect(params().get("draft")).toBe("d2");
    expect(params().get("stage")).toBe("extras");
  });

  test("closing the last tab removes the param", () => {
    const { result } = harness("/pos?draft=d1&stage=goods");

    act(() => result.current[1](null));

    expect(params().has("draft")).toBe(false);
    expect(params().get("stage")).toBe("goods");
  });
});
