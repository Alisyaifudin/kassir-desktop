import { describe, expect, jest, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";
import type { ScrollAnchor } from "~/services/scroll";
import type { AnchorRow } from "./anchor";

/**
 * The list's place is remembered as the sort value of the row under its top edge.
 * Two things can silently break that: putting the position back while the list is
 * already there (a half-scrolled row snapping flush on every re-render), and
 * losing the last scroll because the operator clicked away before the debounce.
 * Both are invisible in a browser and cheap to pin here.
 */
const DAY = 1_767_225_600_000;

let stored: ScrollAnchor = { day: null, values: {} };
const writes: ScrollAnchor[] = [];

mock.module("~/services", () => ({
  service: {
    scroll: {
      get: () => Effect.sync(() => stored),
      set: (_container: string, anchor: ScrollAnchor) =>
        Effect.sync(() => {
          stored = anchor;
          writes.push(anchor);
        }),
    },
  },
}));

const { useScrollAnchor } = await import("./use-scroll-anchor");

/** One line of the table, and the header the sticky rows hide behind. */
const LINE = 41;
const HEADER = 41;

function rows(...values: number[]): AnchorRow[] {
  return values.map((value, index) => ({ id: `r${index}`, value }));
}

type Call = { index: number; align?: string };

function harness({
  values = [500, 400, 300, 200, 100],
  anchor = { day: null, values: {} },
  day = DAY,
  slot = "time:desc",
  selected = null,
  inset = HEADER,
  top = 0,
}: {
  values?: number[];
  anchor?: ScrollAnchor;
  day?: number;
  slot?: string;
  selected?: string | null;
  inset?: number;
  top?: number;
} = {}) {
  stored = anchor;
  writes.length = 0;

  const element = document.createElement("div");
  Object.defineProperty(element, "scrollTop", { value: top, writable: true, configurable: true });

  const calls: Call[] = [];
  // A window of rows laid out under the sticky header, the way the real table is:
  // `scrollMargin` puts the first row one header below the scroll origin, so an
  // item's `end` is "header + however many lines above it".
  const virtualizer = {
    getVirtualItems: () => {
      const from = Math.max(0, Math.floor(element.scrollTop / LINE) - 1);
      return Array.from({ length: values.length - from }, (_, offset) => {
        const index = from + offset;
        return { index, start: HEADER + index * LINE, end: HEADER + (index + 1) * LINE };
      });
    },
    scrollToIndex: (index: number, options?: { align?: string }) => {
      calls.push({ index, align: options?.align });
      // What the real virtualizer does with `scrollPaddingStart`: the row lands
      // below the header, not under it.
      element.scrollTop = index * LINE;
    },
  };

  const list = rows(...values);
  const scrollRef = { current: element };
  // The selection is read through this box so a test can change it and re-render;
  // the row set itself only changes when a new harness is built.
  const props = { selected };
  const view = renderHook(() =>
    useScrollAnchor({
      container: "records",
      slot,
      day,
      rows: list,
      selected: props.selected,
      inset,
      scrollRef,
      virtualizer: virtualizer as never,
    }),
  );

  return {
    calls,
    element,
    select: (id: string | null) => {
      props.selected = id;
      view.rerender();
    },
    unmount: view.unmount,
  };
}

describe("useScrollAnchor", () => {
  test("the row that was on top goes back on top", () => {
    const list = harness({ anchor: { day: DAY, values: { "time:desc": 300 } } });

    expect(list.calls).toEqual([{ index: 2, align: "start" }]);
  });

  test("a position stored on another day is not applied to this day's records", () => {
    const list = harness({ anchor: { day: DAY - 86_400_000, values: { "time:desc": 300 } } });

    // Nothing to go back to, and the list is already at the top: nothing moves.
    expect(list.calls).toEqual([]);
  });

  test("a position for another order is not applied either — that order starts at the top", () => {
    const list = harness({ anchor: { day: DAY, values: { "total:desc": 300 } }, top: 2 * LINE });

    expect(list.calls).toEqual([{ index: 0, align: "start" }]);
  });

  test("with nothing remembered, the open record is revealed", () => {
    const list = harness({ selected: "r3" });

    expect(list.calls).toEqual([{ index: 3, align: "auto" }]);
  });

  test("a list already sitting on the remembered row is left alone", () => {
    // Scrolled half-way into row 2, which is exactly the row it would be sent to:
    // re-applying would snap it flush to the top on every render that rebuilds
    // the rows.
    const list = harness({
      anchor: { day: DAY, values: { "time:desc": 300 } },
      top: 2 * LINE,
    });

    expect(list.calls).toEqual([]);
  });

  test("the rows behind the sticky header do not count as the top", () => {
    jest.useFakeTimers();
    try {
      // Scrolled exactly one line down: row 0 now sits entirely behind the header,
      // so the first row on screen whole — the one to remember — is row 1.
      const list = harness({
        anchor: { day: DAY, values: { "time:desc": 400 } },
        top: LINE,
      });
      act(() => {
        list.element.dispatchEvent(new Event("scroll"));
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(writes).toEqual([{ day: DAY, values: { "time:desc": 400 } }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a row scrolled half out of sight is not the one remembered", () => {
    jest.useFakeTimers();
    try {
      // 12px into row 2: it is still on screen, but not whole, so the position is
      // row 3 — the first one the operator reads from its top.
      const list = harness({
        anchor: { day: DAY, values: { "time:desc": 300 } },
        top: 2 * LINE,
      });
      act(() => {
        list.element.scrollTop = 2 * LINE + 12;
        list.element.dispatchEvent(new Event("scroll"));
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(writes).toEqual([{ day: DAY, values: { "time:desc": 200 } }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a row picked inside the debounce does not snap the list back", () => {
    jest.useFakeTimers();
    try {
      // Scrolled to row 2, then a row is clicked before the debounce lands: the
      // store still says row 0, but the list is at row 2 and has to stay there.
      const list = harness({ anchor: { day: DAY, values: { "time:desc": 500 } } });
      act(() => {
        list.element.scrollTop = 2 * LINE;
        list.element.dispatchEvent(new Event("scroll"));
      });
      expect(writes).toEqual([]);

      act(() => {
        list.select("r2");
      });

      expect(list.calls).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("the position is written only after the scrolling stops", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ anchor: { day: DAY, values: { "time:desc": 300 } }, top: 2 * LINE });
      act(() => {
        list.element.dispatchEvent(new Event("scroll"));
      });

      // Nothing yet: the operator may still be scrolling.
      expect(writes).toEqual([]);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(writes).toEqual([{ day: DAY, values: { "time:desc": 300 } }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("leaving before the debounce still writes where the list was", () => {
    jest.useFakeTimers();
    try {
      const list = harness({ anchor: { day: DAY, values: { "time:desc": 200 } }, top: 3 * LINE });
      act(() => {
        list.element.dispatchEvent(new Event("scroll"));
      });

      act(() => {
        list.unmount();
      });

      expect(writes).toEqual([{ day: DAY, values: { "time:desc": 200 } }]);
    } finally {
      jest.useRealTimers();
    }
  });
});
