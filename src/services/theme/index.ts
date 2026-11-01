import { Context, Data, Effect, Stream } from "effect";

export class ThemeError extends Data.TaggedError("ThemeError")<{ message: string }> {}

/**
 * What the operator chose, not what the screen currently is.
 *
 * `system` is the default and is not a third look: it is the absence of a
 * choice, so a fresh install follows the OS the way the rest of the desktop
 * does. The two looks themselves are the ones `global.css` defines under `.dark`.
 */
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** The two looks the CSS actually defines. */
export type Theme = "light" | "dark";

export const DEFAULT_PREFERENCE: ThemePreference = "system";

/** A stored value is only trusted if the app still knows it. */
export function parsePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.find((preference) => preference === value) ?? DEFAULT_PREFERENCE;
}

/** The look a preference lands on, given what the OS currently says. */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export class ThemeService extends Context.Tag("ThemeService")<
  ThemeService,
  {
    /**
     * The stored preference. The layer hydrates it at build time, so this is
     * answered synchronously — the boot-time apply and the toggle's first render
     * both need it without waiting.
     */
    get: () => Effect.Effect<ThemePreference>;
    /** Persists the preference and repaints this webview. */
    set: (preference: ThemePreference) => Effect.Effect<void, ThemeError>;
    /** Paints the stored preference onto `<html>` — what boot calls once. */
    apply: () => Effect.Effect<void, ThemeError>;
    changes: Stream.Stream<ThemePreference, ThemeError>;
  }
>() {}
