import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useStage } from "./use-stage";

/**
 * Which step of the cart is showing, in the URL so a refresh lands on the same
 * step. The stage list is the screen's own, so an unknown value in a stale link
 * has to fall back to the first step rather than render nothing.
 */
const STAGES = ["goods", "extras"] as const;

let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/pos") {
  return renderHook(() => useStage(STAGES), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useStage", () => {
  test("opens on the first stage", () => {
    expect(harness().result.current[0]).toBe("goods");
  });

  test("reads the step from the URL", () => {
    expect(harness("/pos?stage=extras").result.current[0]).toBe("extras");
  });

  test("a stage this screen does not have falls back to the first", () => {
    expect(harness("/pos?stage=payment").result.current[0]).toBe("goods");
  });

  test("moving a step writes it and keeps the rest of the state", () => {
    const { result } = harness("/pos?draft=d1");

    act(() => result.current[1]("extras"));

    expect(params().get("stage")).toBe("extras");
    expect(params().get("draft")).toBe("d1");
  });
});
