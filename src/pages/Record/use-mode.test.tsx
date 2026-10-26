import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useMode } from "./use-mode";

/**
 * Penjualan or pembelian, in the URL so a link opens the same list. The write
 * drops `selected`: the open record belongs to the list it was picked from, and
 * a mode switch that kept it would show a sale under the purchase filter.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/records") {
  return renderHook(() => useMode(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useMode", () => {
  test("opens on penjualan", () => {
    expect(harness().result.current[0]).toBe("incoming");
  });

  test("reads the mode from the URL", () => {
    expect(harness("/records?mode=outcoming").result.current[0]).toBe("outcoming");
  });

  test("an unknown mode falls back to penjualan", () => {
    expect(harness("/records?mode=refund").result.current[0]).toBe("incoming");
  });

  test("switching drops the open record and keeps the other filters", () => {
    const { result } = harness("/records?query=kopi&selected=r1");

    act(() => result.current[1]("outcoming"));

    expect(params().get("mode")).toBe("outcoming");
    expect(params().has("selected")).toBe(false);
    expect(params().get("query")).toBe("kopi");
  });
});
