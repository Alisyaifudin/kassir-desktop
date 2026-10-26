import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect } from "effect";
import type { Info } from "~/services/info";

/**
 * The info service writes every field at once, so a partial change has to read
 * the current info first. The shop form and the "tampilkan kasir" checkbox both
 * go through here; without the read, whichever saved last would blank the other
 * field with a stale copy.
 */
let current: Info = {
  name: "Toko",
  owner: "",
  address: "",
  footer: "",
  header: "",
  showCashier: false,
};
const written: Info[] = [];

mock.module("~/services", () => ({
  service: {
    info: {
      info: () => Effect.succeed(current),
      set: (info: Info) => {
        written.push(info);
        current = info;
        return Effect.succeed(undefined);
      },
    },
  },
}));

const { patchInfo } = await import("./util-patch-info");

beforeEach(() => {
  current = {
    name: "Toko",
    owner: "",
    address: "",
    footer: "",
    header: "",
    showCashier: false,
  };
  written.length = 0;
});

describe("patchInfo", () => {
  test("writes the current info with the patch laid over it", async () => {
    current = { ...current, name: "Warung Bu Tini", owner: "Bu Tini" };

    await Effect.runPromise(patchInfo({ footer: "Terima kasih" }));

    expect(written).toEqual([
      { ...current, footer: "Terima kasih" },
    ]);
  });

  test("only the patched fields move", async () => {
    await Effect.runPromise(patchInfo({ showCashier: true }));

    expect(written[0]).toEqual({ ...current, showCashier: true });
  });

  test("every call reads the info again, so two saves cannot undo each other", async () => {
    await Effect.runPromise(patchInfo({ name: "Warung" }));
    await Effect.runPromise(patchInfo({ footer: "Terima kasih" }));

    expect(written[1]).toEqual({ ...written[0], footer: "Terima kasih" });
    expect(written[1].name).toBe("Warung");
  });
});
