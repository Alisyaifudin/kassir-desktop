import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { Effect } from "effect";

/**
 * The one "serialise → ask where → write" path. The write happens in Rust, so
 * these pin the contract across the boundary: the command name and argument
 * names, the sanitised default filename, and the three answers a caller must
 * tell apart — wrote a path, cancelled, failed.
 */
type Call = { cmd: string; args: Record<string, unknown> };

const calls: Call[] = [];
let outcome: { kind: "value"; value: unknown } | { kind: "error"; error: unknown } = {
  kind: "value",
  value: "/home/kasir/backup.json",
};

// The rest of the `core` surface is here because a module mock is process-wide:
// another test file may still import the event bridge, which needs it.
mock.module("@tauri-apps/api/core", () => ({
  transformCallback: () => 1,
  Channel: class {},
  convertFileSrc: (path: string) => path,
  isTauri: () => false,
  invoke: (cmd: string, args?: Record<string, unknown>) => {
    calls.push({ cmd, args: args ?? {} });
    return outcome.kind === "error" ? Promise.reject(outcome.error) : Promise.resolve(outcome.value);
  },
}));

// `export.ts` reports a failed write through `log`; the plugin is not what is
// under test here, and importing it would drag in the whole Tauri event bridge.
mock.module("@tauri-apps/plugin-log", () => ({ error: () => {}, info: () => {} }));

const { saveJson } = await import("./export");

const exportCalls = () => calls.filter((call) => call.cmd === "export_file");

beforeEach(() => {
  calls.length = 0;
  outcome = { kind: "value", value: "/home/kasir/backup.json" };
});

describe("saveJson", () => {
  test("asks Rust to write the JSON pretty-printed under a sanitised name", async () => {
    const value = { products: [{ id: "p1", name: "Kopi" }], count: 1 };

    const path = await Effect.runPromise(saveJson("backup/2024:07.json", value));

    expect(path).toBe("/home/kasir/backup.json");
    expect(exportCalls()).toHaveLength(1);
    expect(exportCalls()[0].args).toEqual({
      defaultName: "backup-2024-07.json",
      contents: JSON.stringify(value, null, 2),
    });
  });

  test("every character Windows refuses is replaced; the rest of the name is kept", async () => {
    // The dialog is what actually saves, so a name Windows rejects would be a
    // failed backup on the operator's machine only.
    for (const [name, expected] of [
      ['a\\b/c:d*e?f"g<h>i|j.json', "a-b-c-d-e-f-g-h-i-j.json"],
      ["backup 2024-07 kassir.json", "backup 2024-07 kassir.json"],
      ["data warung kopi.json", "data warung kopi.json"],
    ] as const) {
      await Effect.runPromise(saveJson(name, {}));
      expect(exportCalls().at(-1)?.args.defaultName).toBe(expected);
    }
  });

  test("a cancelled dialog is null, not an empty path", async () => {
    outcome = { kind: "value", value: null };

    expect(await Effect.runPromise(saveJson("backup.json", {}))).toBeNull();
  });

  test("a failed write is an IOError with the cashier sentence and the cause", async () => {
    const cause = new Error("PathForbidden");
    outcome = { kind: "error", error: cause };
    // `export.ts` logs the raw failure before wrapping it; keep the run clean.
    const logged = spyOn(console, "error").mockImplementation(() => {});

    const result = await Effect.runPromise(Effect.either(saveJson("backup.json", {})));
    logged.mockRestore();

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("IOError");
      expect(result.left.e.message).toBe("Gagal menyimpan file. Coba pilih folder lain.");
      expect(result.left.e.cause).toBe(cause);
    }
  });
});
