import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useTab } from "./use-tab";

/**
 * The two faces of a record: the ledger (detail) and the paper (receipt). The
 * ledger is the default, and anything unrecognised has to land there rather than
 * on a blank tab.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/records/r1") {
  return renderHook(() => useTab(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useTab", () => {
  test("opens on the ledger", () => {
    expect(harness().result.current[0]).toBe("detail");
  });

  test("reads the receipt tab from the URL", () => {
    expect(harness("/records/r1?tab=receipt").result.current[0]).toBe("receipt");
  });

  test("an unknown tab is the ledger, not a blank pane", () => {
    expect(harness("/records/r1?tab=notes").result.current[0]).toBe("detail");
  });

  test("switching writes the tab and keeps the other params", () => {
    const { result } = harness("/records/r1?tab=detail&selected=r1");

    act(() => result.current[1]("receipt"));

    expect(params().get("tab")).toBe("receipt");
    expect(params().get("selected")).toBe("r1");
  });
});
