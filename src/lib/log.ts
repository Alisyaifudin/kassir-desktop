import * as logTauri from "@tauri-apps/plugin-log";

export const log = {
  error(e: unknown) {
    console.error(e);
    if (e instanceof Error) {
      const error = `$${e.message}\n${e.name}\n${e.stack}`;
      logTauri.error(error);
    } else if (typeof e === "string") {
      logTauri.error(e);
    } else {
      const unknownError = new Error("Unknown Error", { cause: e });
      const error = `$${unknownError.message}\n${unknownError.name}\n${unknownError.stack}`;
      logTauri.error(error);
    }
  },
  info(e: unknown) {
    console.info(e);
    if (e instanceof Error) {
      const error = `$${e.message}\n${e.name}\n${e.stack}`;
      logTauri.info(error);
    } else if (typeof e === "string") {
      logTauri.info(e);
    } else {
      const unknownError = new Error("Unknown Error", { cause: e });
      const error = `$${unknownError.message}\n${unknownError.name}\n${unknownError.stack}`;
      logTauri.info(error);
    }
  },
};
