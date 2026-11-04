import { describe, expect, test } from "bun:test";
import { idleGroup, type GroupPhase, type GroupState, type GroupTransfer } from "~/services/sync";
import { PHASE_LABEL, formatBytes, transferOf } from "./z-Progress";

/**
 * The two numbers under a sync bar.
 *
 * A percentage answers "how far"; it cannot answer "how much", which is the whole
 * reason a shop watches a first sync — an index of rows and a hundred photographs
 * are the same 40% and a very different wait. The rules under test are the ones an
 * operator would notice if they broke:
 *
 *   * a byte count is readable (binary units, Indonesian numbers, no noise);
 *   * a direction appears when it has moved something, or while it is the phase
 *     running — never as a line of zeros;
 *   * a projection wears a `~`, and a total that is not known is not invented.
 */

function group(overrides: Partial<GroupState> = {}): GroupState {
  return { ...idleGroup("money"), ...overrides };
}

function transfer(down: GroupTransfer["down"], up: GroupTransfer["up"]): GroupTransfer {
  return { down, up };
}

describe("formatBytes", () => {
  test("counts in binary units with Indonesian separators", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1,5 KB");
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2,5 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 3)).toBe("3 GB");
  });

  test("drops the decimal once the number is big enough to read without it", () => {
    // 102.4 KB: the tenth is noise next to three digits, and the bar already
    // moves every page.
    expect(formatBytes(1024 * 102.4)).toBe("102 KB");
    expect(formatBytes(1024 * 9.4)).toBe("9,4 KB");
  });

  test("never renders a negative or a NaN count", () => {
    expect(formatBytes(-5)).toBe("0 B");
  });
});

describe("transferOf", () => {
  test("says nothing for a group that has moved nothing and is idle", () => {
    expect(transferOf(group())).toBeNull();
  });

  test("names both directions once both have moved bytes", () => {
    const line = transferOf(
      group({
        phase: "push",
        transfer: transfer({ bytes: 1536, total: 4096 }, { bytes: 512, total: 2048 }),
      }),
    );
    expect(line).toBe("↓ 1,5 KB dari ~4 KB · ↑ 512 B dari ~2 KB");
  });

  test("shows the direction being worked on, even at zero bytes", () => {
    // A pull that has asked and not yet received: 0 B is the truth, and a bar
    // with no number under it looks stalled.
    expect(transferOf(group({ phase: "pull" }))).toBe("↓ 0 B");
    expect(transferOf(group({ phase: "push" }))).toBe("↑ 0 B");
    // The closing pull is a pull of the same direction: its counter stays.
    expect(
      transferOf(
        group({
          phase: "settle",
          transfer: transfer({ bytes: 900, total: null }, { bytes: 0, total: null }),
        }),
      ),
    ).toBe("↓ 900 B");
  });

  test("names the closing pull as a check, not another download", () => {
    expect(PHASE_LABEL["settle"]).toBe("Memeriksa");
  });

  test("leaves out the total when it is not known", () => {
    const line = transferOf(
      group({
        phase: "pull",
        transfer: transfer({ bytes: 2048, total: null }, { bytes: 0, total: null }),
      }),
    );
    expect(line).toBe("↓ 2 KB");
  });

  test("keeps a finished direction on screen, without a total it has reached", () => {
    const line = transferOf(
      group({
        phase: "done",
        transfer: transfer({ bytes: 1024, total: 1024 }, { bytes: 2048, total: 2048 }),
      }),
    );
    expect(line).toBe("↓ 1 KB · ↑ 2 KB");
  });

  test("a failed group keeps the counters it reached", () => {
    const phases: GroupPhase[] = ["failed", "cancelled"];
    for (const phase of phases) {
      expect(
        transferOf(
          group({
            phase,
            transfer: transfer({ bytes: 1024, total: 4096 }, { bytes: 0, total: null }),
          }),
        ),
      ).toBe("↓ 1 KB dari ~4 KB");
    }
  });
});
