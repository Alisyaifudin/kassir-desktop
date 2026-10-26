import { afterEach, describe, expect, test } from "bun:test";
import { canRead, readText, writeText } from "./clipboard";

/**
 * The goods grid copies cells with these. The async clipboard is not always
 * there — a Linux build runs on `tauri://localhost`, which is not a secure
 * context everywhere — so writing has an `execCommand` fallback, and reading has
 * to admit when it cannot work rather than consume the key silently.
 */
const originalExec = document.execCommand;

function clipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

function execCommand(impl: ((command: string) => boolean) | undefined) {
  Object.defineProperty(document, "execCommand", {
    value: impl,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  clipboard(undefined);
  execCommand(originalExec);
});

describe("canRead", () => {
  test("true only when the async read API exists", () => {
    clipboard({ readText: async () => "x" });
    expect(canRead()).toBe(true);

    clipboard({ writeText: async () => {} });
    expect(canRead()).toBe(false);

    clipboard(undefined);
    expect(canRead()).toBe(false);
  });
});

describe("writeText", () => {
  test("uses the async API when it is there", async () => {
    const written: string[] = [];
    clipboard({ writeText: async (text: string) => void written.push(text) });

    expect(await writeText("10000")).toBe(true);
    expect(written).toEqual(["10000"]);
  });

  test("falls back to a hidden textarea when the async write is refused", async () => {
    clipboard({ writeText: async () => Promise.reject(new Error("NotAllowed")) });
    let copied = "";
    execCommand((command) => {
      copied = (document.querySelector("textarea") as HTMLTextAreaElement | null)?.value ?? "";
      return command === "copy";
    });

    expect(await writeText("Rp12.500")).toBe(true);
    expect(copied).toBe("Rp12.500");
    // The textarea is removed either way — it must not linger in the grid.
    expect(document.querySelector("textarea")).toBeNull();
  });

  test("keeps the keyboard where it was", async () => {
    clipboard(undefined);
    execCommand(() => true);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    await writeText("x");

    expect(document.activeElement).toBe(input);
    input.remove();
  });

  test("answers false when neither path lands", async () => {
    clipboard(undefined);
    execCommand(() => false);
    expect(await writeText("x")).toBe(false);
  });
});

describe("readText", () => {
  test("returns the clipboard text", async () => {
    clipboard({ readText: async () => "Rp9.000" });
    expect(await readText()).toBe("Rp9.000");
  });

  test("null when the API is missing, so the caller lets the paste event through", async () => {
    clipboard(undefined);
    expect(await readText()).toBeNull();
  });

  test("null when the read is refused", async () => {
    clipboard({ readText: async () => Promise.reject(new Error("NotAllowed")) });
    expect(await readText()).toBeNull();
  });
});
