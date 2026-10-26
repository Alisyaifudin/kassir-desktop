import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { useGetUrlBack } from "./use-get-url-back";

/**
 * Where a screen returns to. `url_back` is an in-app path the caller supplies, so
 * it is parsed rather than trusted: a protocol-relative `//evil.com` is the shape
 * that turns a future `<a href>` into an open redirect, and it must fall back to
 * the screen's own default.
 */
function wrapper(entry: string) {
  function RouterWrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  }
  RouterWrapper.displayName = "RouterWrapper";
  return RouterWrapper;
}

function backOf(entry: string, fallback?: string) {
  const { result } = renderHook(() => useGetUrlBack(fallback), { wrapper: wrapper(entry) });
  return result.current;
}

describe("useGetUrlBack", () => {
  test("keeps a rooted in-app path", () => {
    expect(backOf("/record?url_back=/records%3Fday%3D1")).toBe("/records?day=1");
  });

  test("falls back when the value is not an in-app path", () => {
    expect(backOf("/record?url_back=https%3A%2F%2Fevil.com", "/money")).toBe("/money");
    expect(backOf("/record?url_back=%2F%2Fevil.com", "/money")).toBe("/money");
    expect(backOf("/record?url_back=records", "/money")).toBe("/money");
  });

  test("no param means the caller's default", () => {
    expect(backOf("/record")).toBe("/");
    expect(backOf("/record", "/money")).toBe("/money");
  });
});
