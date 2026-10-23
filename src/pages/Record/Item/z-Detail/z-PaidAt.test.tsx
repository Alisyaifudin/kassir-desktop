import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Effect } from "effect";
import { Temporal } from "temporal-polyfill";
import { epochFromPlain } from "~/lib/date";
import type { RecordFull } from "~/services/record";

/**
 * The record's settlement, corrected from the page it is read on. The trigger is
 * still the labelled ghost button; the editor behind it is the wheel picker, and
 * it holds its pick until Simpan — a wheel step must not write a record update
 * per notch, and Batal must write nothing at all.
 */
const writes: { id: string; paidAt: number }[] = [];

mock.module("~/services", () => ({
  service: {
    record: {
      set: {
        paidAt: (id: string, paidAt: number) => {
          writes.push({ id, paidAt });
          return Effect.void;
        },
      },
    },
  },
}));

const { PaidAt } = await import("./z-PaidAt");

const PAID_AT = epochFromPlain(
  Temporal.PlainDateTime.from({
    year: 2026,
    month: 10,
    day: 23,
    hour: 14,
    minute: 58,
    second: 7,
  }),
);

function record(paidAt: number | null = PAID_AT): RecordFull {
  return { id: "r1", paidAt } as RecordFull;
}

beforeEach(() => {
  writes.length = 0;
});

describe("PaidAt", () => {
  test("the trigger keeps the settlement as its label", () => {
    render(<PaidAt record={record()} />);

    expect(screen.getByRole("button", { name: /Dibayar 14:58/ })).toBeTruthy();
  });

  test("a record with no settlement shows no control", () => {
    const { container } = render(<PaidAt record={record(null)} />);

    expect(container.textContent).toBe("");
  });

  test("the dialog opens on the wheel, and Simpan writes the pick once", async () => {
    render(<PaidAt record={record()} />);

    fireEvent.click(screen.getByRole("button", { name: /Dibayar/ }));
    const wheel = await screen.findByRole("group", { name: "Waktu" });

    // Move the day back one; nothing is written until Simpan.
    fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(writes).toHaveLength(0);

    // The mutation resolves outside the event handler, so its state updates are
    // flushed inside `act` rather than warned about.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.id).toBe("r1");
    expect(writes[0]?.paidAt).toBeLessThan(PAID_AT);
  });

  test("Batal writes nothing, even after a changed pick", async () => {
    render(<PaidAt record={record()} />);

    fireEvent.click(screen.getByRole("button", { name: /Dibayar/ }));
    const wheel = await screen.findByRole("group", { name: "Waktu" });
    fireEvent.keyDown(wheel, { key: "ArrowDown" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    });

    expect(writes).toHaveLength(0);
  });

  test("Simpan waits for the pick to actually move", async () => {
    render(<PaidAt record={record()} />);

    fireEvent.click(screen.getByRole("button", { name: /Dibayar/ }));
    const wheel = await screen.findByRole("group", { name: "Waktu" });
    const save = screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement;

    expect(save.disabled).toBe(true);

    fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(save.disabled).toBe(false);
  });
});
