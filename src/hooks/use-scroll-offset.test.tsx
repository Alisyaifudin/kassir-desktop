import { useCallback } from "react";
import { afterEach, beforeEach, describe, expect, jest, mock, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { Effect } from "effect";
import type { ScrollAnchor } from "~/services/scroll";

/**
 * Two lists keep one plain offset per slot: the cart screen's goods box (a slot per
 * tab) and the Analytics shell's content box (a slot per face of the rail). Both are
 * one box that outlives what it is showing, so "where the list is" is not one number
 * — without the slot, the next tab opens at the previous tab's offset, which is a
 * place in a different list.
 */
const CONTAINER = "cart";

let stored: ScrollAnchor["cart"] = { positions: {} };
const writes: ScrollAnchor["cart"][] = [];

mock.module("~/services", () => ({
  service: {
    scroll: {
      get: () => Effect.sync(() => stored),
      set: (_container: string, anchor: ScrollAnchor["cart"]) =>
        Effect.sync(() => {
          stored = anchor;
          writes.push(anchor);
        }),
    },
  },
}));

const { useScrollOffset } = await import("./use-scroll-offset");

/**
 * A box with a real browser's limit: `scrollTop` cannot go past the content. happy-dom
 * has no layout, so the limit is a number the test raises to mean "the rows arrived".
 */
type Limits = { max: number };

function Box({ slot, top, limits }: { slot: string | null; top: number; limits: Limits }) {
  const scrollRef = useScrollOffset(CONTAINER, slot);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null) {
        let value = top;
        Object.defineProperty(node, "scrollTop", {
          configurable: true,
          get: () => value,
          set: (next: number) => {
            value = Math.max(0, Math.min(next, limits.max));
          },
        });
        node.scrollTop = top;
      }
      scrollRef(node);
    },
    [scrollRef, top, limits],
  );
  return <div ref={attach} data-box="" />;
}

function harness({
  slot = "a",
  top = 0,
  positions = {},
  max = Number.POSITIVE_INFINITY,
}: {
  slot?: string | null;
  top?: number;
  positions?: Record<string, number>;
  max?: number;
} = {}) {
  stored = { positions };
  writes.length = 0;
  const limits: Limits = { max };
  const tree = render(<Box slot={slot} top={top} limits={limits} />);
  const box = document.querySelector<HTMLElement>("[data-box]") as HTMLElement;
  return {
    box,
    limits,
    scrollTo: (offset: number) =>
      act(() => {
        box.scrollTop = offset;
        box.dispatchEvent(new Event("scroll"));
      }),
    switchTo: (next: string | null) =>
      tree.rerender(<Box slot={next} top={0} limits={limits} />),
  };
}

/**
 * `ResizeObserver` is the hook's way of retrying a restore while the content is still
 * arriving; the test drives it by hand, which is the only way to reproduce "the box
 * was a skeleton when the position was applied".
 */
const watchers: (() => void)[] = [];

/** Put back after each test: `motion` and the cart's layout effects need the real one. */
const realResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  watchers.length = 0;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    constructor(callback: () => void) {
      watchers.push(callback);
    }
    observe() {}
    disconnect() {}
  };
});

afterEach(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = realResizeObserver;
});

/** The content grew: the observers fire, as the browser's would. */
function grow(limits: Limits, max: number) {
  limits.max = max;
  act(() => {
    for (const watcher of [...watchers]) watcher();
  });
}

describe("useScrollOffset", () => {
  test("the slot that is open comes back to its own offset", () => {
    const list = harness({ slot: "a", positions: { a: 240, b: 80 } });

    expect(list.box.scrollTop).toBe(240);
  });

  test("another slot opens at its own place, not at the previous one's", () => {
    const list = harness({ slot: "a", positions: { a: 240, b: 80 } });

    list.switchTo("b");

    expect(list.box.scrollTop).toBe(80);
  });

  test("a slot that has never been scrolled starts at the top", () => {
    const list = harness({ slot: "a", positions: { a: 240 } });

    list.switchTo("c");

    expect(list.box.scrollTop).toBe(0);
  });

  test("nothing is remembered while there is no slot", () => {
    const list = harness({ slot: null, top: 180 });

    expect(list.box.scrollTop).toBe(180);
    expect(writes).toEqual([]);
  });

  test("an offset the box was too short to take is applied once the rows arrive", () => {
    // The position is from the products table, but the box mounts on its skeleton:
    // the write is clamped to nothing, which is what "back goes to the top" was.
    const list = harness({ slot: "a", positions: { a: 1_240 }, max: 0 });
    expect(list.box.scrollTop).toBe(0);

    // The table renders: 2 400 px of content in a 600 px box.
    grow(list.limits, 1_800);

    expect(list.box.scrollTop).toBe(1_240);
  });

  test("the position is written after scrolling stops", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ slot: "a" });
      list.scrollTo(320);

      expect(writes).toEqual([]);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(writes).toEqual([{ positions: { a: 320 } }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a switch inside the debounce still writes the slot that was scrolled", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ slot: "a", positions: { b: 80 } });
      list.scrollTo(320);

      // No time for the debounce: the switch itself has to save, under `a` — the
      // slot that was scrolled — before `b` is read back.
      list.switchTo("b");

      expect(writes).toEqual([{ positions: { b: 80, a: 320 } }]);
      expect(list.box.scrollTop).toBe(80);
    } finally {
      jest.useRealTimers();
    }
  });
});
