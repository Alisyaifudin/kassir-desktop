import { Effect, Layer, SubscriptionRef } from "effect";
import { LocalStorageService } from "../local-storage";
import {
  DEFAULT_PREFERENCE,
  ThemeError,
  ThemeService,
  parsePreference,
  type ThemePreference,
} from ".";
import { THEME_KEY, paint } from "./paint";
import { log } from "~/lib/log";

export const ThemeLive = Layer.effect(
  ThemeService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    // Hydrate once at build time, not on first read: `main.tsx` paints the theme
    // before the first render, and it has no await to spend on localStorage.
    const initialPreference = yield* storage.get<unknown>(THEME_KEY).pipe(
      Effect.map(parsePreference),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_PREFERENCE)),
      // The layer build has no error channel for this read, so a failing store
      // would revert the theme with no way to ever surface it — recorded.
      Effect.catchTag("LocalStorageError", (error) =>
        Effect.sync(() =>
          log.error(`theme: gagal membaca preferensi tema: ${error.message}`),
        ).pipe(Effect.as(DEFAULT_PREFERENCE)),
      ),
    );

    const preferenceRef = yield* SubscriptionRef.make<ThemePreference>(initialPreference);

    /**
     * While the preference is `system`, the OS can change under a running app
     * (a scheduled sunset switch), so the screen follows without a relaunch.
     * Registered for the app's lifetime: this layer is built once at boot.
     */
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (Effect.runSync(SubscriptionRef.get(preferenceRef)) === "system") paint("system");
      });
    }

    return {
      get: () => SubscriptionRef.get(preferenceRef),
      apply: () => Effect.sync(() => paint(initialPreference)),
      set: (preference) =>
        // Screen first, memory second, disk last: the theme is already painted,
        // so a refused write must not repaint it. localStorage fails on a full or
        // disabled profile, and the toggle reports that where it can be retried.
        Effect.sync(() => paint(preference)).pipe(
          Effect.zipRight(SubscriptionRef.set(preferenceRef, preference)),
          Effect.zipRight(
            storage
              .set(THEME_KEY, preference)
              .pipe(Effect.mapError((error) => new ThemeError({ message: error.message }))),
          ),
        ),
      changes: preferenceRef.changes,
    };
  }),
);
