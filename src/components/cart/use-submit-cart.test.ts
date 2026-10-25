import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";

/**
 * One implementation of "Bayar", shared by Pos and Restock. The sequence is the
 * money path: refuse when not ready (and let the key stay put), blur the active
 * cell, mark the screen busy, submit exactly once, then either toast the failure
 * or hand the completion payload to the dialog. Stubbed at the service boundary.
 */
const submitted: { id: string; cashier: string; credit: boolean | undefined }[] = [];
const errors: string[] = [];
let outcome: "ok" | "fail" = "ok";

mock.module("~/hooks/use-user", () => ({ useUser: () => ({ name: "Kasir" }) }));
mock.module("sonner", () => ({ toast: { error: (message: string) => errors.push(message) } }));
mock.module("~/services", () => ({
  service: {
    transaction: {
      submit: (id: string, input: { cashier: string; credit?: boolean }) => {
        submitted.push({ id, cashier: input.cashier, credit: input.credit });
        return outcome === "ok"
          ? Effect.succeed("record-1")
          : Effect.fail(new Error("Stok Kopi tidak mencukupi"));
      },
    },
  },
}));

const { useSubmitCart } = await import("./use-submit-cart");

function harness({
  ready = () => true,
  blocked = false,
}: {
  ready?: (credit: boolean) => boolean;
  blocked?: boolean;
} = {}) {
  const submitting: boolean[] = [];
  const completed: { recordId: string }[] = [];
  const { result } = renderHook(() =>
    useSubmitCart<{ recordId: string }>({
      activeId: "draft-1",
      blocked,
      ready,
      setSubmitting: (value) => {
        submitting.push(value);
      },
      setComplete: (complete) => {
        completed.push(complete);
      },
      build: (recordId) => ({ recordId }),
    }),
  );
  return { result, submitting, completed };
}

describe("useSubmitCart", () => {
  test("a ready sale submits once and opens the completion dialog", async () => {
    submitted.length = 0;
    outcome = "ok";
    const { result, submitting, completed } = harness();

    let message: string | null = "unset";
    await act(async () => {
      message = await result.current.submit();
    });

    expect(message).toBeNull();
    expect(submitted).toEqual([{ id: "draft-1", cashier: "Kasir", credit: false }]);
    expect(submitting).toEqual([true, false]);
    expect(completed).toEqual([{ recordId: "record-1" }]);
  });

  test("a failed submit toasts the message and hands it back to the caller", async () => {
    submitted.length = 0;
    errors.length = 0;
    outcome = "fail";
    const { result, submitting, completed } = harness();

    let message: string | null = "";
    await act(async () => {
      message = await result.current.submit(true);
    });

    expect(message).toBe("Stok Kopi tidak mencukupi");
    expect(errors).toEqual(["Stok Kopi tidak mencukupi"]);
    expect(completed).toHaveLength(0);
    expect(submitting).toEqual([true, false]);
    expect(submitted[0]?.credit).toBe(true);
  });

  test("a cart that is not ready does not submit, and the key is not swallowed", async () => {
    submitted.length = 0;
    outcome = "ok";
    const { result, submitting, completed } = harness({ ready: () => false });

    let swallowed = true;
    act(() => {
      swallowed = result.current.submitDraft();
    });

    expect(swallowed).toBe(false);
    expect(submitted).toHaveLength(0);
    expect(submitting).toHaveLength(0);
    expect(completed).toHaveLength(0);
  });

  test("a blocked cart (submitting, or a completion dialog already open) stays put", async () => {
    submitted.length = 0;
    outcome = "ok";
    const { result } = harness({ blocked: true });

    let swallowed = true;
    act(() => {
      swallowed = result.current.submitDraft();
    });

    expect(swallowed).toBe(false);
    expect(submitted).toHaveLength(0);
    expect(await result.current.submit()).toBe("Transaksi belum siap untuk disimpan.");
  });
});
