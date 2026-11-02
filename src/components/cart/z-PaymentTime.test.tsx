import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Effect } from "effect";
import type { Draft } from "~/services/transaction";

/**
 * The control that decides *when* a record is settled. `saat ini` is the normal
 * case and must leave `paid_at` alone; turning it off is what writes a pick to
 * the draft, and the picker that appears is walled at the moment it was opened —
 * a reading past the wall is a complaint under the wheels, not a refusal by them.
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

  test("a pick past the opening moment is written, not clamped", () => {
    const picked = Date.now();
    render(<PaymentTime draft={draft(picked)} />);
    const group = screen.getByRole("group", { name: "Waktu" });

    // The wall narrows no column: each keeps the bound its own scale has.
    expect(screen.getByRole("spinbutton", { name: "jam" }).getAttribute("aria-valuemax")).toBe(
      "23",
    );

    // The year is always steppable (its floor is five years back), so it crosses
    // the wall without the day-of-month clamps a forward day step runs into.
    // The draft keeps the later instant: holding the commit is the picker's
    // complaint and `submit`'s clamp to `Date.now()`, not this control's.
    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowRight" }); // tahun
    fireEvent.keyDown(group, { key: "ArrowDown" });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.paidAt).toBeGreaterThan(picked);
  });

  test("a post-dated pick is complained about only once the field is left", () => {
    // The draft already holds a later instant than the wall — the operator's own
    // pick, read back after a re-render.
    render(<PaymentTime draft={draft(Date.now() + 60 * 60 * 1000)} />);
    const group = screen.getByRole("group", { name: "Waktu" });

    // Still being looked at: nothing is accused while the wheel is in hand.
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.blur(group);

    expect(screen.getByRole("alert").textContent).toContain("masa depan");
  });

  test("a wheel step writes the chosen instant back to the draft", () => {
    const picked = Date.now();
    render(<PaymentTime draft={draft(picked)} />);

    // Step the `tahun` column, not the `hari` it starts on. A step backwards from
    // the day clamps to itself on the 1st of the month — and a clamped edge emits
    // an equal value, which the wheel deliberately does not write — so the day
    // column is only steppable on 30 days out of 31. A year always has room: its
    // floor is five years back.
    const group = screen.getByRole("group", { name: "Waktu" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowUp" });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.paidAt).toBeLessThan(picked);
  });
});
