import { useCallback } from "react";
import { describe, expect, jest, mock, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { Effect } from "effect";
import type { ScrollAnchor } from "~/services/scroll";
import type { ListView } from "./scroll-anchor";

/**
 * The product list is paginated, so its page is in the URL already; what is stored
 * is the offset inside the page and the product at its top-left. The pair has to
 * survive three things that a plain offset does not: the box being *replaced* by the
 * other view, the box being left before the debounce, and a page or filter that no
 * longer holds the rows the position was read on.
 *
 * happy-dom has no layout, so each card gets a synthetic one: `ITEM` tall, stacked
 * under the box's top, moving with `scrollTop`.
 */
const ITEM = 100;

let stored: ScrollAnchor["products"] = { key: "", view: "", id: null, top: 0 };
const writes: ScrollAnchor["products"][] = [];

mock.module("~/services", () => ({
  service: {
    scroll: {
      get: () => Effect.sync(() => stored),
      set: (_container: string, anchor: ScrollAnchor["products"]) =>
        Effect.sync(() => {
          stored = anchor;
          writes.push(anchor);
        }),
    },
  },
}));

const { useScrollAnchor } = await import("./use-scroll-anchor");

/** Lay a card out as if the box were scrolled to its current offset. */
function place(card: HTMLElement, index: number, box: () => HTMLElement | null) {
  card.getBoundingClientRect = () => {
    const top = index * ITEM - (box()?.scrollTop ?? 0);
    return {
      top,
      bottom: top + ITEM,
      height: ITEM,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

function List({
  listKey,
  view,
  ids,
  top,
}: {
  listKey: string;
  view: ListView;
  ids: string[];
  /** Where the box already is when it mounts, as a window that kept its offset would be. */
  top: number;
}) {
  const scrollRef = useScrollAnchor({ listKey, view });
  const box = () => document.querySelector<HTMLElement>("[data-box]");
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      // Before the hook's layout effect reads it, as a browser would have it.
      if (node !== null) node.scrollTop = top;
      scrollRef(node);
    },
    [scrollRef, top],
  );
  return (
    <div ref={attach} data-box="">
      {ids.map((id, index) => (
        <div
          key={id}
          data-product-id={id}
          ref={(card) => {
            if (card !== null) place(card, index, box);
          }}
        />
      ))}
    </div>
  );
}

function harness({
  listKey = "page-1",
  view = "grid",
  ids = ["a", "b", "c", "d"],
  top = 0,
  anchor = { key: "", view: "", id: null, top: 0 },
}: {
  listKey?: string;
  view?: ListView;
  ids?: string[];
  top?: number;
  anchor?: ScrollAnchor["products"];
} = {}) {
  stored = anchor;
  writes.length = 0;
  const tree = render(<List listKey={listKey} view={view} ids={ids} top={top} />);
  const box = document.querySelector<HTMLElement>("[data-box]") as HTMLElement;
  return {
    box,
    /** Scroll the box, and let the position land on a card as it would in a window. */
    scrollTo: (offset: number) =>
      act(() => {
        box.scrollTop = offset;
        box.dispatchEvent(new Event("scroll"));
      }),
    rerender: (next: { listKey?: string; view?: ListView; ids?: string[]; top?: number }) =>
      tree.rerender(
        <List
          listKey={next.listKey ?? listKey}
          view={next.view ?? view}
          ids={next.ids ?? ids}
          top={next.top ?? top}
        />,
      ),
    unmount: tree.unmount,
  };
}

describe("useScrollAnchor", () => {
  test("the page comes back to the offset it was left at", () => {
    const list = harness({ anchor: { key: "page-1", view: "grid", id: "b", top: 140 } });

    // Rendered into a real box that started at 0, then scrolled by the hook.
    expect(list.box.scrollTop).toBe(140);
  });

  test("the other view opens on the product that was on top, not on its offset", () => {
    const list = harness({
      view: "table",
      anchor: { key: "page-1", view: "grid", id: "c", top: 140 },
    });

    // c is the third card of the page; the table starts its row there.
    expect(list.box.scrollTop).toBe(2 * ITEM);
  });

  test("another page starts at the top", () => {
    const list = harness({
      listKey: "page-2",
      anchor: { key: "page-1", view: "grid", id: "c", top: 140 },
      top: 140,
    });

    expect(list.box.scrollTop).toBe(0);
  });

  test("a product that is no longer on the page starts the list at the top", () => {
    const list = harness({
      view: "table",
      ids: ["x", "y"],
      anchor: { key: "page-1", view: "grid", id: "c", top: 140 },
    });

    expect(list.box.scrollTop).toBe(0);
  });

  test("the position is written after scrolling stops, with the product on top", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ anchor: { key: "page-1", view: "grid", id: "a", top: 0 } });
      // 30 px into the second card: it is on screen, but not whole, so the product
      // on top of the readable area is the third one.
      list.scrollTo(ITEM + 30);

      expect(writes).toEqual([]);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(writes).toEqual([{ key: "page-1", view: "grid", id: "c", top: ITEM + 30 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("toggling the view writes the box it is leaving before the other one reads it", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ anchor: { key: "page-1", view: "grid", id: "a", top: 0 } });
      list.scrollTo(2 * ITEM);

      // No time for the debounce: the toggle itself has to save the grid's place.
      list.rerender({ view: "table" });

      expect(writes).toEqual([{ key: "page-1", view: "grid", id: "c", top: 2 * ITEM }]);
      const table = document.querySelector<HTMLElement>("[data-box]") as HTMLElement;
      expect(table.scrollTop).toBe(2 * ITEM);
    } finally {
      jest.useRealTimers();
    }
  });
});
