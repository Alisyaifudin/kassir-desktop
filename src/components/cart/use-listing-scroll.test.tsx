import { useCallback } from "react";
import { describe, expect, jest, mock, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { Effect } from "effect";
import type { ScrollAnchor } from "~/services/scroll";

/**
 * The goods list of the cart screen is one scroll box shared by every open tab, so
 * "where the list is" is not one number: it is one number *per cart*. Without that,
 * switching tabs left the new sale at the old sale's offset, which is a place in a
 * different list.
 */
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

const { useListingScroll } = await import("./use-listing-scroll");

function Box({ cartId, top }: { cartId: string | null; top: number }) {
  const scrollRef = useListingScroll(cartId);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      // Where the box already is when it mounts, as a browser would have it.
      if (node !== null) node.scrollTop = top;
      scrollRef(node);
    },
    [scrollRef, top],
  );
  return <div ref={attach} data-box="" />;
}

function harness({
  cartId = "a",
  top = 0,
  positions = {},
}: {
  cartId?: string | null;
  top?: number;
  positions?: Record<string, number>;
} = {}) {
  stored = { positions };
  writes.length = 0;
  const tree = render(<Box cartId={cartId} top={top} />);
  const box = document.querySelector<HTMLElement>("[data-box]") as HTMLElement;
  return {
    box,
    scrollTo: (offset: number) =>
      act(() => {
        box.scrollTop = offset;
        box.dispatchEvent(new Event("scroll"));
      }),
    switchTo: (id: string | null) => tree.rerender(<Box cartId={id} top={0} />),
  };
}

describe("useListingScroll", () => {
  test("the cart that is open comes back to its own offset", () => {
    const list = harness({ cartId: "a", positions: { a: 240, b: 80 } });

    expect(list.box.scrollTop).toBe(240);
  });

  test("another tab opens at its own place, not at the previous tab's", () => {
    const list = harness({ cartId: "a", positions: { a: 240, b: 80 } });

    list.switchTo("b");

    expect(list.box.scrollTop).toBe(80);
  });

  test("a cart that has never been scrolled starts at the top", () => {
    const list = harness({ cartId: "a", positions: { a: 240 } });

    list.switchTo("c");

    expect(list.box.scrollTop).toBe(0);
  });

  test("the offset is written after scrolling stops", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ cartId: "a" });
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

  test("a tab switch inside the debounce still writes the tab that was scrolled", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ cartId: "a", positions: { b: 80 } });
      list.scrollTo(320);

      // No time for the debounce: the switch itself has to save, under `a` — the
      // cart that was scrolled — before `b` is read back.
      list.switchTo("b");

      expect(writes).toEqual([{ positions: { b: 80, a: 320 } }]);
      expect(list.box.scrollTop).toBe(80);
    } finally {
      jest.useRealTimers();
    }
  });
});
