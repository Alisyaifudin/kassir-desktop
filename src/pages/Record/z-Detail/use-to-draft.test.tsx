import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import type { RecordMode } from "~/services/record";
import { TransactionError } from "~/services/transaction";

/**
 * "Jadikan Transaksi" rebuilds a saved record as a cart and then has to open it:
 * the copy is one tab among however many the cashier already has, so the hook's
 * whole job is to land on that tab's screen with `?draft=` naming it.
 */

const calls: string[] = [];
let outcome: "ok" | "fail" = "ok";

mock.module("~/services", () => ({
  service: {
    transaction: {
      add: {
        fromRecord: (recordId: string) => {
          calls.push(recordId);
          return outcome === "ok"
            ? Effect.succeed("draft-9")
            : Effect.fail(new TransactionError({ message: "Catatan tidak ditemukan" }));
        },
      },
    },
  },
}));

const { useToDraft } = await import("./use-to-draft");

let current = "";

function Probe() {
  const location = useLocation();
  current = `${location.pathname}${location.search}`;
  return null;
}

function harness(mode: RecordMode) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={["/records"]}>
        <Probe />
        {children}
      </MemoryRouter>
    );
  }
  return renderHook(() => useToDraft("r1", mode), { wrapper });
}

describe("useToDraft", () => {
  test("opens the new cart on Pos for a sale", async () => {
    calls.length = 0;
    outcome = "ok";
    const { result } = harness("incoming");

    await act(async () => {
      await result.current.copy();
    });

    expect(calls).toEqual(["r1"]);
    expect(current).toBe("/pos?draft=draft-9");
  });

  test("opens it on Restock for a purchase", async () => {
    calls.length = 0;
    outcome = "ok";
    const { result } = harness("outcoming");

    await act(async () => {
      await result.current.copy();
    });

    expect(current).toBe("/restock?draft=draft-9");
  });

  test("stays on the record when the copy fails", async () => {
    calls.length = 0;
    outcome = "fail";
    const { result } = harness("incoming");

    await act(async () => {
      await result.current.copy();
    });

    expect(result.current.error).toBe("Catatan tidak ditemukan");
    expect(current).toBe("/records");
  });
});
