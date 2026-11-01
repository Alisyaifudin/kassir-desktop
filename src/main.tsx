import { Effect } from "effect";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import "./global.css";
import { log } from "./lib/log";
import { formatError } from "./lib/utils";
import { router } from "./route";
import { service } from "./services";

/**
 * Two per-machine preferences are applied *before* the first paint: the
 * interface scale and the theme. A webview that paints at 100% and then jumps to
 * 150% is a flash on every launch, and one that paints white before the stored
 * `dark` class lands is a white flash at night — both read as the app resetting
 * itself rather than remembering.
 *
 * Neither preference may keep the app closed: they are cosmetic, and the Setting
 * rows report the same failure where it can be retried.
 */
async function boot() {
  // Independent on purpose: a refusal of one must not leave the other unapplied.
  try {
    await Effect.runPromise(service.theme.apply());
  } catch (error) {
    log.error(formatError(error));
  }

  try {
    await Effect.runPromise(service.zoom.apply());
  } catch (error) {
    log.error(formatError(error));
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <RouterProvider router={router} />,
  );
}

void boot();
