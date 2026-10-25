import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Effect } from "effect";
import type { Draft } from "~/services/transaction";

/**
 * The control that decides *when* a record is settled. `saat ini` is the normal
 * case and must leave `paid_at` alone; turning it off is what writes a pick to
 * the draft, and the picker that appears is capped at the moment it was opened.
 *
 * The service is stubbed at its boundary — the component only needs
 * `set.paidAt` — so the test can see exactly what a click writes.
 */
const writes: { id: string; paidAt: number | null }[] = [];

mock.module("~/services", () => ({
  service: {
    transaction: {
      set: {
        paidAt: (id: string, paidAt: number | null) => {
          writes.push({ id, paidAt });
          return Effect.void;
        },
      },
      reportError: () => Effect.void,
    },
  },
}));

const { PaymentTime } = await import("./z-PaymentTime");

function draft(paidAt: number | null): Draft {
  return { id: "d1", paidAt } as Draft;
}

beforeEach(() => {
  writes.length = 0;
});

describe("PaymentTime", () => {
  test("`saat ini` is checked by default and no picker is shown", () => {
    render(<PaymentTime draft={draft(null)} />);

    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("checked");
    expect(screen.queryByRole("group", { name: "Waktu" })).toBeNull();
  });

  test("unchecking writes a pick seeded with the moment it was opened", () => {
    const before = Date.now();
    render(<PaymentTime draft={draft(null)} />);

    fireEvent.click(screen.getByRole("checkbox"));

    expect(writes).toHaveLength(1);
    expect(writes[0]?.id).toBe("d1");
    // A real instant, not a frozen default: the wall and the seed are "now".
    expect(writes[0]?.paidAt).toBeGreaterThanOrEqual(before);
  });

  test("a picked time shows the wheel under a `saat ini` that is unchecked", () => {
    render(<PaymentTime draft={draft(Date.now())} />);

    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("unchecked");
    expect(screen.getByRole("group", { name: "Waktu" })).toBeTruthy();
  });

  test("the picker is capped at the moment it was opened", () => {
    const { container } = render(<PaymentTime draft={draft(Date.now())} />);

    // At the wall the day column cannot advance, so its max is its current
    // reading, and the future row is drawn disabled rather than hidden.
    const day = screen.getByRole("spinbutton", { name: "hari" });
    expect(day.getAttribute("aria-valuemax")).toBe(day.getAttribute("aria-valuenow"));
    expect(container.querySelectorAll('[aria-disabled="true"]').length).toBeGreaterThan(0);
  });

  test("a wheel step writes the chosen instant back to the draft", () => {
    const picked = Date.now();
    render(<PaymentTime draft={draft(picked)} />);

    fireEvent.keyDown(screen.getByRole("group", { name: "Waktu" }), { key: "ArrowUp" });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.paidAt).toBeLessThan(picked);
  });
});
