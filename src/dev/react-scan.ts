/**
 * React Scan — dev only, never part of the app bundle.
 *
 * `vite.config.ts` injects this file as its own `<script type="module">` tag
 * ahead of `/src/main.tsx`, so it is delivered and evaluated *before* the app
 * graph. That ordering is the whole point: react-scan patches
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__` at import time, and react-dom only announces
 * itself to that hook while its module is evaluating. Import this from
 * `main.tsx` instead and react-scan arrives after the fact — it then logs
 * "Must import React Scan before React runs" and shows nothing.
 *
 * Nothing in `src/` imports it, so it never reaches a production build; the
 * guard below only covers running this entry against a built bundle by hand.
 */
import { scan } from "react-scan";

if (import.meta.env.DEV) {
  scan({ enabled: true, showToolbar: true });
}
