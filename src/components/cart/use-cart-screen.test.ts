import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect, Stream } from "effect";
import type { Draft } from "~/services/transaction";

/**
 * `useCartScreen` is the single owner of the cart lifecycle on both screens —
 * which drafts exist, which one is open, the "there is always one cart" guard,
 * the `?draft=` repair, the tab walker and the F1/F2/F12 shortcuts. It was
 * extracted to *remove* duplication, which makes it the one module where a
 * lifecycle rule cannot be covered by the two screens: a regression here breaks
 * Pos and Restock at once.
 *
 * Stubbed at the service boundary (`~/services`), never at hook internals.
 */
type Call = { kind: string; args: unknown[] };

let calls: Call[] = [];
/** What the next `transaction.add.new` does. */
let addOutcome: "ok" | "fail" = "ok";
let nextId = 0;
/**
 * The device's memory of the cart that was open (`cart.last-draft.*`), and its
 * traffic kept apart from `calls`: which cart is remembered is bookkeeping, not
 * a cart lifecycle event, and the assertions below count the latter.
 */
let remembered: string | null = null;
let storeCalls: { key: string; value?: unknown }[] = [];

function record(kind: string) {
  return (...args: unknown[]) => {
    calls.push({ kind, args });
  };
}

mock.module("sonner", () => ({ toast: { error: () => {} } }));
mock.module("~/services", () => ({
  service: {
    store: {
      get: (key: string) => {
        storeCalls.push({ key });
        return remembered === null
          ? Effect.fail(new Error(`Store "${key}" tidak ditemukan`))
          : Effect.succeed(remembered);
      },
      set: (key: string, value: unknown) => {
        storeCalls.push({ key, value });
        remembered = String(value);
        return Effect.void;
      },
    },
    listing: {
      get: { changes: Stream.make([]) },
    },
    transaction: {
      add: {
        new: (mode: string) => {
          calls.push({ kind: "add.new", args: [mode] });
          return addOutcome === "ok"
            ? Effect.succeed(`new-${++nextId}`)
            : Effect.fail(new Error("Gagal membuat keranjang"));
        },
      },
      set: {
        store: (id: string) => {
          calls.push({ kind: "set.store", args: [id] });
          return Effect.void;
        },
        restore: (id: string) => {
          calls.push({ kind: "set.restore", args: [id] });
          return Effect.void;
        },
        title: (id: string, title: string) => {
          calls.push({ kind: "set.title", args: [id, title] });
          return Effect.void;
        },
      },
      listings: { set: record("listings.set") },
      extras: { set: record("extras.set") },
      reportError: record("reportError"),
    },
  },
}));

const { useCartScreen } = await import("./use-cart-screen");
const { useDialogLock } = await import("~/hooks/use-dialog-lock");

// Each test starts as a device that remembers nothing; the ones that care set
// `remembered` before mounting.
beforeEach(() => {
  calls = [];
  storeCalls = [];
  remembered = null;
});

function makeDraft(id: string, overrides: Partial<Draft> = {}): Draft {
  return {
    id,
    order: 0,
    flag: 0,
    title: "Transaksi Baru",
    mode: "incoming",
    fix: 0,
    note: "",
    customerId: null,
    customerName: "",
    customerPhone: "",
    paidAt: null,
    supplierId: null,
    supplierName: "",
    rounding: 0,
    listings: [],
    extras: [],
    methods: [],
    images: [],
    ...overrides,
  };
}

const PARKED = 0b01;

function harness({
  drafts = [] as Draft[],
  draftId = null as string | null,
  mode = "incoming" as "incoming" | "outcoming",
  lock = false,
} = {}) {
  const onDraft = mock((id: string | null) => {
    calls.push({ kind: "onDraft", args: [id] });
  });
  const onStage = mock((stage: string) => {
    calls.push({ kind: "onStage", args: [stage] });
  });
  const onF2 = mock(() => {
    calls.push({ kind: "onF2", args: [] });
  });
  const onF1 = mock((focus: () => void) => {
    calls.push({ kind: "onF1", args: [] });
    focus();
  });
  const initialProps = { drafts, draftId };
  const view = renderHook(
    ({ drafts: current, draftId: currentId }: typeof initialProps) => {
      if (lock) useDialogLock(true);
      return useCartScreen({
        mode,
        drafts: current,
        firstStage: "listing",
        onStage,
        draftId: currentId,
        onDraft,
        onF1,
        onF2,
      });
    },
    { initialProps },
  );
  return { ...view, onDraft, onStage, onF2, onF1 };
}

/**
 * Let the hook's promise callbacks (add.new, store, restore) and its
 * `setTimeout(…, 0)` focus bump land.
 */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function press(key: string, init: KeyboardEventInit = {}, target?: HTMLElement) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    (target ?? document.body).dispatchEvent(event);
  });
  return event;
}

function kinds(): string[] {
  return calls.map((call) => call.kind);
}

describe("useCartScreen — one cart, always", () => {
  test("creates exactly one cart when the screen has none", async () => {
    calls = [];
    addOutcome = "ok";
    const { onDraft } = harness({ drafts: [] });
    await flush();

    expect(calls.filter((call) => call.kind === "add.new")).toHaveLength(1);
    expect(calls.filter((call) => call.kind === "add.new")[0].args).toEqual(["incoming"]);
    expect(onDraft).toHaveBeenCalledTimes(1);
  });

  test("does not create a cart while a draft already exists", async () => {
    calls = [];
    harness({ drafts: [makeDraft("d1")] });
    await flush();
    expect(kinds()).not.toContain("add.new");
  });

  test("does not create a cart while the completion dialog owns the screen", async () => {
    calls = [];
    const view = harness({ drafts: [makeDraft("d1")] });
    act(() => {
      view.result.current.setComplete({ recordId: "r1" } as never);
    });
    // The last draft goes away while the dialog is up: the guard must hold.
    view.rerender({ drafts: [], draftId: null });
    await flush();
    expect(kinds()).not.toContain("add.new");
  });

  test("a failed create surfaces an error and retryStart tries again", async () => {
    calls = [];
    addOutcome = "fail";
    const view = harness({ drafts: [] });
    await flush();
    expect(view.result.current.startError).toBe("Gagal membuat keranjang");

    addOutcome = "ok";
    act(() => {
      view.result.current.retryStart();
    });
    await flush();
    expect(view.result.current.startError).toBeNull();
    expect(calls.filter((call) => call.kind === "add.new")).toHaveLength(2);
  });

  test("repairs a ?draft= that names a closed cart", async () => {
    calls = [];
    const { onDraft } = harness({ drafts: [makeDraft("d1"), makeDraft("d2")], draftId: "gone" });
    await flush();
    // Nothing remembered, so the newest tab — not tab one, which is where every
    // return to the screen used to land.
    expect(onDraft).toHaveBeenLastCalledWith("d2");
    expect(kinds()).not.toContain("add.new");
  });
});

describe("useCartScreen — the cart it opens with", () => {
  test("opens the cart this device had open last, not the first tab", async () => {
    calls = [];
    remembered = "d2";
    const { onDraft } = harness({
      drafts: [makeDraft("d1", { order: 0 }), makeDraft("d2", { order: 1 })],
    });
    await flush();
    expect(onDraft).toHaveBeenLastCalledWith("d2");
    // Already the remembered cart: nothing to write back.
    expect(storeCalls.filter((call) => call.value !== undefined)).toEqual([]);
  });

  test("with nothing remembered it opens the newest tab", async () => {
    calls = [];
    const { onDraft } = harness({
      drafts: [makeDraft("d1", { order: 0 }), makeDraft("d2", { order: 1 })],
    });
    await flush();
    expect(onDraft).toHaveBeenLastCalledWith("d2");
  });

  test("a remembered cart that was parked is not reopened", async () => {
    calls = [];
    remembered = "d2";
    const { onDraft } = harness({
      drafts: [makeDraft("d1", { order: 0 }), makeDraft("d2", { order: 1, flag: PARKED })],
    });
    await flush();
    expect(onDraft).toHaveBeenLastCalledWith("d1");
  });

  test("a ?draft= in the address bar still wins over the remembered cart", async () => {
    calls = [];
    remembered = "d2";
    const { result, onDraft } = harness({
      drafts: [makeDraft("d1", { order: 0 }), makeDraft("d2", { order: 1 })],
      draftId: "d1",
    });
    await flush();
    expect(result.current.activeId).toBe("d1");
    // Named, so there is nothing to repair — and the cart under the cursor
    // becomes the remembered one.
    expect(onDraft).not.toHaveBeenCalled();
    expect(remembered).toBe("d1");
  });

  test("switching tabs remembers the new one for the next visit", async () => {
    calls = [];
    const drafts = [makeDraft("d1", { order: 0 }), makeDraft("d2", { order: 1 })];
    const { rerender } = harness({ drafts, draftId: "d1" });
    await flush();

    rerender({ drafts, draftId: "d2" });
    await flush();

    expect(remembered).toBe("d2");
    expect(storeCalls.filter((call) => call.value !== undefined).at(-1)?.key).toBe(
      "cart.last-draft.incoming",
    );
  });
});

describe("useCartScreen — parked carts", () => {
  test("storeCart parks the active cart and clears the selection when it was the last", async () => {
    calls = [];
    const { result } = harness({ drafts: [makeDraft("d1")], draftId: "d1" });
    await act(async () => {
      result.current.storeCart();
    });
    await flush();
    expect(kinds()).toContain("set.store");
    expect(calls.find((call) => call.kind === "onDraft")?.args).toEqual([null]);
  });

  test("openDraft restores a parked cart before selecting it", async () => {
    calls = [];
    const parked = makeDraft("d2", { flag: PARKED, order: 1 });
    const { result } = harness({ drafts: [makeDraft("d1"), parked], draftId: "d1" });
    await act(async () => {
      result.current.openDraft("d2");
    });
    await flush();
    expect(kinds()).toEqual(["set.restore", "onDraft"]);
    expect(calls[1].args).toEqual(["d2"]);
  });
});

describe("useCartScreen — keyboard", () => {
  test("Ctrl+ArrowRight moves to the next open cart, skipping parked ones", async () => {
    calls = [];
    const parked = makeDraft("d3", { flag: PARKED, order: 2 });
    const { onDraft } = harness({
      drafts: [makeDraft("d1"), makeDraft("d2", { order: 1 }), parked],
      draftId: "d1",
    });
    await flush();
    onDraft.mockClear();
    press("ArrowRight", { ctrlKey: true });
    expect(onDraft).toHaveBeenCalledWith("d2");
  });

  test("Ctrl+Arrow does nothing when the cursor is in a text field", async () => {
    calls = [];
    const { onDraft } = harness({
      drafts: [makeDraft("d1"), makeDraft("d2", { order: 1 })],
      draftId: "d1",
    });
    await flush();
    onDraft.mockClear();
    const input = document.createElement("input");
    document.body.appendChild(input);
    press("ArrowRight", { ctrlKey: true }, input);
    expect(onDraft).not.toHaveBeenCalled();
    input.remove();
  });

  test("F12 starts a new cart", async () => {
    calls = [];
    addOutcome = "ok";
    harness({ drafts: [makeDraft("d1")], draftId: "d1" });
    await flush();
    calls = [];
    press("F12");
    await flush();
    expect(kinds()).toContain("add.new");
  });

  test("F1 and F2 reach the screen's own handlers", async () => {
    calls = [];
    const { onF1, onF2 } = harness({ drafts: [makeDraft("d1")], draftId: "d1" });
    await flush();
    press("F1");
    press("F2");
    expect(onF1).toHaveBeenCalledTimes(1);
    expect(onF2).toHaveBeenCalledTimes(1);
  });

  test("switching carts returns to the first stage", async () => {
    calls = [];
    const { rerender, onStage } = harness({
      drafts: [makeDraft("d1"), makeDraft("d2", { order: 1 })],
      draftId: "d1",
    });
    await flush();
    onStage.mockClear();
    rerender({ drafts: [makeDraft("d1"), makeDraft("d2", { order: 1 })], draftId: "d2" });
    await flush();
    expect(onStage).toHaveBeenCalledWith("listing");
  });
});

describe("useCartScreen — a dialog owns the keyboard", () => {
  test("no shortcut acts while a cart dialog is registered", async () => {
    calls = [];
    const { onF1, onF2, onDraft } = harness({
      drafts: [makeDraft("d1"), makeDraft("d2", { order: 1 })],
      draftId: "d1",
      lock: true,
    });
    await flush();
    calls = [];
    onDraft.mockClear();
    press("F12");
    press("F1");
    press("F2");
    press("ArrowRight", { ctrlKey: true });
    await flush();

    expect(kinds()).toEqual([]);
    expect(onF1).not.toHaveBeenCalled();
    expect(onF2).not.toHaveBeenCalled();
    expect(onDraft).not.toHaveBeenCalled();
  });

  test("a portaled modal in the DOM also holds the shortcuts", async () => {
    calls = [];
    const { onF2 } = harness({ drafts: [makeDraft("d1")], draftId: "d1" });
    await flush();
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    press("F2");
    expect(onF2).not.toHaveBeenCalled();
    modal.remove();
    press("F2");
    expect(onF2).toHaveBeenCalledTimes(1);
  });
});
