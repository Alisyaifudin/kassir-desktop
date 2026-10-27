import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { STORED_FLAG, TransactionError, type Draft, type DraftMode } from "~/services/transaction";

/**
 * "Jadikan transaksi stok/toko" moves an open cart to the other screen: the
 * draft row changes mode, and the cashier has to land on the cart it became —
 * `?draft=` naming it, on the screen that lists that mode.
 */

const calls: string[] = [];
let outcome: "ok" | "fail" = "ok";
/** The flag the flipped draft is read back with — parked carts are unparked. */
let flag = 0;

mock.module("~/services", () => ({
  service: {
    transaction: {
      set: {
        mode: (id: string, mode: DraftMode) => {
          calls.push(`mode:${id}:${mode}`);
          return outcome === "ok"
            ? Effect.succeed(undefined)
            : Effect.fail(new TransactionError({ message: "Keranjang belum tersimpan" }));
        },
        restore: (id: string) => {
          calls.push(`restore:${id}`);
          return Effect.succeed(undefined);
        },
      },
      get: {
        drafts: (mode: DraftMode) => {
          calls.push(`drafts:${mode}`);
          return Effect.succeed([{ id: "d1", flag } as Draft]);
        },
      },
    },
  },
}));

const { useFlipMode } = await import("./use-flip-mode");

let current = "";

function Probe() {
  const location = useLocation();
  current = `${location.pathname}${location.search}`;
  return null;
}

function harness() {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={["/pos?draft=d1"]}>
        <Probe />
        {children}
      </MemoryRouter>
    );
  }
  return renderHook(() => useFlipMode("d1"), { wrapper });
}

describe("useFlipMode", () => {
  test("sends a sale to Restock as the same draft", async () => {
    calls.length = 0;
    outcome = "ok";
    flag = 0;
    const { result } = harness();

    await act(async () => {
      await result.current.flip("outcoming");
    });

    expect(calls).toEqual(["mode:d1:outcoming", "drafts:outcoming"]);
    expect(current).toBe("/restock?draft=d1");
  });

  test("sends a purchase to Pos as the same draft", async () => {
    calls.length = 0;
    outcome = "ok";
    flag = 0;
    const { result } = harness();

    await act(async () => {
      await result.current.flip("incoming");
    });

    expect(calls).toEqual(["mode:d1:incoming", "drafts:incoming"]);
    expect(current).toBe("/pos?draft=d1");
  });

  test("unparks a stored cart, because a parked one is not named by ?draft=", async () => {
    calls.length = 0;
    outcome = "ok";
    flag = STORED_FLAG;
    const { result } = harness();

    await act(async () => {
      await result.current.flip("outcoming");
    });

    expect(calls).toEqual(["mode:d1:outcoming", "drafts:outcoming", "restore:d1"]);
    expect(current).toBe("/restock?draft=d1");
  });

  test("stays put when the flip is refused", async () => {
    calls.length = 0;
    outcome = "fail";
    flag = 0;
    const { result } = harness();

    await act(async () => {
      await result.current.flip("outcoming");
    });

    expect(result.current.error).toBe("Keranjang belum tersimpan");
    expect(current).toBe("/pos?draft=d1");
  });
});
