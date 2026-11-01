import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { RecordError, type RecordMode } from "~/services/record";
import { route } from "~/services/route/instance";
import { RouteSync } from "~/services/route/react";

/**
 * Flipping a record's mode does not rewrite it — the service writes a copy,
 * soft-deletes the original and returns the copy's id — so the page has to
 * follow that id instead of sitting on a tombstone. Stubbed at the service
 * boundary, the same way the cart's submit test is.
 */

const calls: { id: string; mode: RecordMode }[] = [];
let outcome: "ok" | "fail" = "ok";

mock.module("~/services", () => ({
  service: {
    record: {
      set: {
        mode: (id: string, mode: RecordMode) => {
          calls.push({ id, mode });
          return outcome === "ok"
            ? Effect.succeed("r2")
            : Effect.fail(new RecordError({ message: "Gagal mengubah mode" }));
        },
      },
    },
  },
}));

const { retargetUrlBack, useChangeMode } = await import("./use-change-mode");

const urls = () => Effect.runSync(route.get()).map((entry) => entry.url);

let current = "";

function Probe() {
  const location = useLocation();
  current = `${location.pathname}${location.search}`;
  return null;
}

/**
 * The record opened from `behind`, so the stack has a list to retarget — the
 * screen `Back` would return to.
 */
function harness(entry: string, behind: string[] = []) {
  const [first, ...rest] = [...behind, entry];
  Effect.runSync(route.reset(first));
  for (const url of rest) {
    Effect.runSync(route.intend(url, "push"));
    Effect.runSync(route.commit({ url, key: url }));
  }
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[entry]}>
        <RouteSync />
        <Probe />
        {children}
      </MemoryRouter>
    );
  }
  return renderHook(() => useChangeMode("r1"), { wrapper });
}

describe("useChangeMode", () => {
  test("follows the copy and keeps the face the record was open on", async () => {
    calls.length = 0;
    outcome = "ok";
    const { result } = harness("/records/r1?tab=receipt", ["/records?mode=incoming"]);

    await act(async () => {
      await result.current.change("outcoming");
    });

    expect(calls).toEqual([{ id: "r1", mode: "outcoming" }]);
    // The copy takes the record's place, on the same tab.
    expect(current).toBe("/records/r2?tab=receipt");
    // And the list behind it is retargeted: the old mode no longer holds it.
    expect(urls()).toEqual(["/records?mode=outcoming", "/records/r2?tab=receipt"]);
  });

  test("stays put when the service refuses", async () => {
    calls.length = 0;
    outcome = "fail";
    const { result } = harness("/records/r1", ["/records?mode=incoming"]);

    await act(async () => {
      await result.current.change("outcoming");
    });

    expect(calls).toEqual([{ id: "r1", mode: "outcoming" }]);
    expect(result.current.error).toBe("Gagal mengubah mode");
    expect(current).toBe("/records/r1");
    // Nothing moved, so nothing behind it was rewritten either.
    expect(urls()).toEqual(["/records?mode=incoming", "/records/r1"]);
  });
});

describe("retargetUrlBack", () => {
  test("points the record list at the mode the record moved to", () => {
    expect(retargetUrlBack("/records?mode=incoming&selected=r1", "outcoming")).toBe(
      "/records?mode=outcoming",
    );
  });

  test("adds the mode to a list that had only the default", () => {
    expect(retargetUrlBack("/records", "outcoming")).toBe("/records?mode=outcoming");
  });

  test("follows the comprehensive search too", () => {
    expect(retargetUrlBack("/records/search?mode=incoming&q=kopi", "outcoming")).toBe(
      "/records/search?mode=outcoming&q=kopi",
    );
  });

  test("leaves screens that do not filter by mode alone", () => {
    expect(retargetUrlBack("/debt", "outcoming")).toBe("/debt");
    expect(retargetUrlBack(null, "outcoming")).toBeNull();
  });
});
