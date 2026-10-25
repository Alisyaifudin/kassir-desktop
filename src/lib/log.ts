import * as logTauri from "@tauri-apps/plugin-log";

/**
 * Logging must never break the caller: the Tauri log plugin is absent outside the
 * app (unit tests, the e2e shim) and can fail on a full disk, so every call is
 * fire-and-forget and every rejection is swallowed.
 */
function write(kind: "error" | "info", message: string) {
  try {
    const result = logTauri[kind](message);
    if (result instanceof Promise) void result.catch(() => {});
  } catch {
    // No plugin (tests, e2e): the console call below is the record.
  }
}

export const log = {
  error(e: Error | string) {
    const error = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : e;
    console.error(e);
    write("error", error);
  },
  info(msg: string) {
    console.info(msg);
    write("info", msg);
  },
};
