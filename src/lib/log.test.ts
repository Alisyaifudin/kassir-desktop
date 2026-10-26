import { describe, expect, mock, spyOn, test } from "bun:test";

/**
 * Logging must never break its caller. The Tauri log plugin is absent outside
 * the app and can fail on a full disk, so both the throwing call and the
 * rejected promise are swallowed — the app keeps selling, and the console line
 * is the record.
 */
mock.module("@tauri-apps/plugin-log", () => ({
  error: () => {
    throw new Error("no plugin");
  },
  info: () => {
    throw new Error("no plugin");
  },
}));

const { log } = await import("./log");

describe("log", () => {
  test("a thrown plugin call does not reach the caller", () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    log.error(new Error("boom"));
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  test("an Error is logged with its name, message and stack", () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("database is locked");

    expect(() => log.error(cause)).not.toThrow();
    expect(error.mock.calls[0][0]).toBe(cause);
    error.mockRestore();
  });

  test("a string is logged as-is", () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    expect(() => log.error("gagal")).not.toThrow();
    expect(error.mock.calls[0][0]).toBe("gagal");
    error.mockRestore();
  });

  test("info reaches the console and does not throw", () => {
    const info = spyOn(console, "info").mockImplementation(() => {});
    expect(() => log.info("mulai")).not.toThrow();
    expect(info).toHaveBeenCalledWith("mulai");
    info.mockRestore();
  });
});
