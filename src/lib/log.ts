import * as logTauri from "@tauri-apps/plugin-log";

export const log = {
  error(e: Error | string) {
    let error = "";
    if (e instanceof Error) {
      error = `$${e.message}\n${e.name}\n${e.stack}`;
    } else {
      error = e;
    }
    console.error(e);
    logTauri.error(error);
  },
};
