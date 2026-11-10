import { describe, expect, test } from "bun:test";
import { AUTO_DEFAULT, AUTO_INTERVALS, SYNC_GROUPS, normalizeAuto } from ".";

/**
 * The stored schedule, as the scheduler will read it.
 *
 * Everything here is about a value that came off disk: an older build's shape, a
 * hand-edited file, a group this build does not have. None of it may throw, and
 * none of it may produce an interval the panel cannot draw.
 */
describe("normalizeAuto", () => {
  test("a missing value is the default schedule", () => {
    expect(normalizeAuto(undefined)).toEqual(AUTO_DEFAULT);
    expect(normalizeAuto(null)).toEqual(AUTO_DEFAULT);
    expect(normalizeAuto("nope")).toEqual(AUTO_DEFAULT);
    expect(normalizeAuto(7)).toEqual(AUTO_DEFAULT);
  });

  test("the switch is only on when it is literally true", () => {
    expect(normalizeAuto({ enabled: true }).enabled).toBe(true);
    expect(normalizeAuto({ enabled: "true" }).enabled).toBe(false);
    expect(normalizeAuto({ enabled: 1 }).enabled).toBe(false);
    expect(normalizeAuto({}).enabled).toBe(false);
  });

  test("an interval off the list snaps to the nearest stop", () => {
    expect(normalizeAuto({ everyMinutes: 1 }).everyMinutes).toBe(1);
    expect(normalizeAuto({ everyMinutes: 10 }).everyMinutes).toBe(10);
    // Between stops: nearest wins, ties resolve to the shorter wait.
    expect(normalizeAuto({ everyMinutes: 3 }).everyMinutes).toBe(2);
    expect(normalizeAuto({ everyMinutes: 4 }).everyMinutes).toBe(5);
    expect(normalizeAuto({ everyMinutes: 60 }).everyMinutes).toBe(10);
    // Absent or unusable falls back to the default stop.
    expect(normalizeAuto({}).everyMinutes).toBe(AUTO_DEFAULT.everyMinutes);
    expect(normalizeAuto({ everyMinutes: "5" }).everyMinutes).toBe(AUTO_DEFAULT.everyMinutes);
    expect(normalizeAuto({ everyMinutes: Number.NaN }).everyMinutes).toBe(
      AUTO_DEFAULT.everyMinutes,
    );
  });

  test("the timer switch is separate from the interval it remembers", () => {
    expect(normalizeAuto({ interval: false, everyMinutes: 10 })).toMatchObject({
      interval: false,
      everyMinutes: 10,
    });
    expect(normalizeAuto({ interval: true }).interval).toBe(true);
    // Absent is on, which is what the defaults say.
    expect(normalizeAuto({}).interval).toBe(true);
    // ...except for a schedule written when off was `everyMinutes: 0`.
    expect(normalizeAuto({ everyMinutes: 0 })).toMatchObject({
      interval: false,
      everyMinutes: AUTO_DEFAULT.everyMinutes,
    });
  });

  test("edit groups are filtered and put back in SYNC_GROUPS order", () => {
    expect(normalizeAuto({ editGroups: ["record", "product"] }).editGroups).toEqual([
      "product",
      "record",
    ]);
    // A group another build knew, and a name that is not a group at all.
    expect(normalizeAuto({ editGroups: ["product", "warehouse", 42] }).editGroups).toEqual([
      "product",
    ]);
    // Empty is a choice — the timer only.
    expect(normalizeAuto({ editGroups: [] }).editGroups).toEqual([]);
    // Absent or not an array is "all", which is what the defaults say.
    expect(normalizeAuto({}).editGroups).toEqual([...SYNC_GROUPS]);
    expect(normalizeAuto({ editGroups: "all" }).editGroups).toEqual([...SYNC_GROUPS]);
  });

  test("every interval the panel can pick survives a round trip", () => {
    for (const stop of AUTO_INTERVALS) {
      expect(normalizeAuto({ enabled: true, everyMinutes: stop }).everyMinutes).toBe(stop);
    }
  });
});
