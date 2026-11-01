import { DEFAULT_PREFERENCE, parsePreference, resolveTheme, type ThemePreference } from ".";

/**
 * The DOM half of the theme, shared by the service and the pre-paint boot script.
 *
 * It lives outside `live.ts` because `src/theme-boot.ts` runs before the app
 * exists and must not build a layer to read one string: the key, the class and
 * the paint are the contract between the two, and they only agree if they are
 * written once.
 */

/** localStorage key. One flat string on purpose: it is read before the app renders. */
export const THEME_KEY = "theme";

/**
 * The class Tailwind's `dark:` variant keys off (`@custom-variant dark` in
 * `global.css` is `&:is(.dark *)`), so it belongs on `<html>`: every `dark:`
 * utility in the app — and every `.dark` token override — then applies at once.
 */
export const DARK_CLASS = "dark";

/** What the OS says right now. A webview without `matchMedia` is a light one. */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * The one place the app touches the document's theme.
 *
 * The class drives the tokens and every `dark:` utility; `color-scheme` is
 * written alongside it so the parts the webview paints itself — scrollbars, text
 * selection, native pickers — are not left white on a dark page.
 */
export function paint(preference: ThemePreference): void {
  const dark = resolveTheme(preference, systemPrefersDark()) === "dark";
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/**
 * The stored preference, read synchronously straight from localStorage.
 *
 * Only the pre-paint script uses this; everywhere else goes through
 * `ThemeService`, which can be pointed at a different backend (the end-to-end
 * harness does). A profile that refuses to be read is treated as "no choice",
 * which is the same answer the service gives.
 */
export function readPreference(): ThemePreference {
  try {
    return parsePreference(JSON.parse(localStorage.getItem(THEME_KEY) ?? "null"));
  } catch {
    return DEFAULT_PREFERENCE;
  }
}
