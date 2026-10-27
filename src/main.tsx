import { Effect } from "effect";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import "./global.css";
import { log } from "./lib/log";
import { formatError } from "./lib/utils";
import { router } from "./route";
import { service } from "./services";

/**
 * The interface scale is a per-machine preference, so it is applied *before* the
 * first paint: a webview that paints at 100% and then jumps to 150% is a flash on
 * every launch, which reads as the app resizing itself rather than remembering.
 *
 * A refused scale must not keep the app closed — the preference is cosmetic, and
 * the Setting slider reports the same failure where it can be retried.
 */
async function boot() {
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
