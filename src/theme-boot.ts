import { paint, readPreference } from "./services/theme/paint";

/**
 * Paints the stored theme before the first frame.
 *
 * `src/main.tsx` applies it again through the service, but by then the stylesheet
 * is already live and the webview has painted a white page — which, on a machine
 * that chose dark, is a flash at every launch. This module is loaded from
 * `index.html` ahead of the app for exactly that one paint; it deliberately has
 * no other job, and it shares the key, the class and the paint with the service
 * (`services/theme/paint.ts`) so the two cannot drift.
 *
 * A module script rather than an inline one because the production CSP allows
 * `script-src 'self'` only.
 */
paint(readPreference());
