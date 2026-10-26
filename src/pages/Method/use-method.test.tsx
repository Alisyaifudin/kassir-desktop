import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useMethod } from "./use-method";

/**
 * The method page's tab: a defaultable kind (Transfer, Debit, QRIS), in the URL
 * so a page can be linked to. Cash is not a tab here — it has no accounts — so an
 * unknown kind lands on Transfer.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/method") {
  return renderHook(() => useMethod(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useMethod", () => {
  test("opens on transfer", () => {
    expect(harness().result.current[0]).toBe("transfer");
  });

  test("reads the kind from the URL", () => {
    expect(harness("/method?method=qris").result.current[0]).toBe("qris");
  });

  test("an unknown or non-defaultable kind falls back to transfer", () => {
    expect(harness("/method?method=cash").result.current[0]).toBe("transfer");
    expect(harness("/method?method=nope").result.current[0]).toBe("transfer");
  });

  test("picking a tab writes it", () => {
    const { result } = harness("/method?method=qris");

    act(() => result.current[1]("debit"));

    expect(params().get("method")).toBe("debit");
  });
});
