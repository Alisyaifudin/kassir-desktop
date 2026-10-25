import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { RecordError, type RecordMode } from "~/services/record";

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

let current = "";

function Probe() {
  const location = useLocation();
  current = `${location.pathname}${location.search}`;
  return null;
}

function harness(entry: string) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[entry]}>
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
    const { result } = harness(`/records/r1?tab=receipt&url_back=${encodeURIComponent("/records?mode=incoming")}`);

    await act(async () => {
      await result.current.change("outcoming");
    });

    expect(calls).toEqual([{ id: "r1", mode: "outcoming" }]);
    expect(current).toBe(
      `/records/r2?tab=receipt&url_back=${encodeURIComponent("/records?mode=outcoming")}`,
    );
  });

  test("stays put when the service refuses", async () => {
    calls.length = 0;
    outcome = "fail";
    const { result } = harness("/records/r1");

    await act(async () => {
      await result.current.change("outcoming");
    });

    expect(calls).toEqual([{ id: "r1", mode: "outcoming" }]);
    expect(result.current.error).toBe("Gagal mengubah mode");
    expect(current).toBe("/records/r1");
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
