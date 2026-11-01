import { beforeEach, describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Option, Stream } from "effect";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { DEFAULT_PREFERENCE, ThemeService } from ".";
import { ThemeLive } from "./live";
import { THEME_KEY, paint, readPreference } from "./paint";

/**
 * The theme lives in two places: localStorage, which is the preference for the
 * next launch, and the `dark` class on `<html>`, which is what Tailwind's `dark:`
 * variant and the `.dark` tokens key off. These tests pin both — the boot-time
 * paint, the persist, the `system` default following the OS, and the write that
 * fails on a full profile.
 */
const media = { current: installMedia(false) };

/** A controllable `prefers-color-scheme`, so `system` can be tested both ways. */
function installMedia(initialDark: boolean) {
  const state = { dark: initialDark };
  const listeners = new Set<() => void>();

  window.matchMedia = ((query: string) => ({
    get matches() {
      return state.dark;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;

  return {
    set(dark: boolean) {
      state.dark = dark;
      for (const listener of listeners) listener();
    },
  };
}

function setup(seed: Record<string, unknown> = {}) {
  const storage = makeTestLocalStorage(seed);
  return {
    entries: storage.entries,
    state: storage.state,
    layer: ThemeLive.pipe(Layer.provide(storage.layer)),
  };
}

function run<A>(
  layer: Layer.Layer<ThemeService>,
  program: (theme: Context.Tag.Service<typeof ThemeService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const theme = yield* ThemeService;
      return yield* program(theme);
    }).pipe(Effect.provide(layer)),
  );
}

/** Whether the app is painted dark right now, as the CSS sees it. */
function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

beforeEach(() => {
  // A fresh fake per test: the previous test's layers are still subscribed to the
  // old one, and a `system` layer from an earlier test would repaint on this
  // test's OS change. The app builds the layer once, so this is test isolation
  // only.
  media.current = installMedia(false);
  document.documentElement.classList.remove("dark");
  document.documentElement.style.removeProperty("color-scheme");
});

describe("ThemeService", () => {
  test("with nothing stored the app follows the system", async () => {
    const { layer } = setup();

    expect(await run(layer, (theme) => theme.get())).toBe(DEFAULT_PREFERENCE);
    expect(DEFAULT_PREFERENCE).toBe("system");
  });

  test("a stored preference is what the first read returns", async () => {
    expect(await run(setup({ theme: "dark" }).layer, (theme) => theme.get())).toBe("dark");
    expect(await run(setup({ theme: "light" }).layer, (theme) => theme.get())).toBe("light");
  });

  test("a stored value the app does not know falls back to system", async () => {
    for (const stored of ["purple", "", true, 1, null, { theme: "dark" }]) {
      const { layer } = setup({ theme: stored });

      expect(await run(layer, (theme) => theme.get())).toBe(DEFAULT_PREFERENCE);
    }
  });

  test("boot paints the stored preference onto <html>", async () => {
    await run(setup({ theme: "dark" }).layer, (theme) => theme.apply());

    expect(isDark()).toBe(true);
    // Native chrome — scrollbars, selection, pickers — is painted by the webview.
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  test("boot with no choice paints what the OS is", async () => {
    media.current.set(true);
    await run(setup().layer, (theme) => theme.apply());

    expect(isDark()).toBe(true);
  });

  test("a chosen theme is painted, persisted, and read back on the next launch", async () => {
    const { entries, layer } = setup();

    await run(layer, (theme) => theme.set("dark"));

    expect(isDark()).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(entries.get("theme")).toBe("dark");
    expect(await run(layer, (theme) => theme.get())).toBe("dark");

    // Next launch: a fresh layer over the same storage.
    const next = makeTestLocalStorage(Object.fromEntries(entries));
    const nextLayer = ThemeLive.pipe(Layer.provide(next.layer));
    expect(await run(nextLayer, (theme) => theme.get())).toBe("dark");
  });

  test("choosing light after dark takes the class back off", async () => {
    const { layer } = setup({ theme: "dark" });

    await run(layer, (theme) => theme.set("light"));

    expect(isDark()).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  test("the change is echoed to subscribers", async () => {
    const { layer } = setup({ theme: "dark" });

    const first = await run(layer, (theme) => Stream.runHead(theme.changes));

    expect(Option.getOrNull(first)).toBe("dark");
  });

  test("while following the system, a change in the OS repaints the app", async () => {
    const { layer } = setup();
    await run(layer, (theme) => theme.apply());
    expect(isDark()).toBe(false);

    media.current.set(true);
    expect(isDark()).toBe(true);
  });

  test("an explicit choice ignores the OS", async () => {
    const { layer } = setup({ theme: "light" });
    await run(layer, (theme) => theme.apply());

    media.current.set(true);

    expect(isDark()).toBe(false);
  });

  test("a full storage still themes this session, and says the write failed", async () => {
    const { entries, state, layer } = setup();
    state.failure = "local storage penuh";

    const result = await run(layer, (theme) =>
      Effect.gen(function* () {
        const either = yield* Effect.either(theme.set("dark"));
        return { either, current: yield* theme.get() };
      }),
    );

    expect(result.either._tag).toBe("Left");
    expect(isDark()).toBe(true);
    expect(result.current).toBe("dark");
    expect(entries.has("theme")).toBe(false);
  });
});

/**
 * `src/theme-boot.ts` paints before the app exists, so it cannot go through the
 * service. These tests pin that it reads the key the service writes and paints
 * the class the service paints — the two halves of the same contract.
 */
describe("the pre-paint paint", () => {
  test("reads what the service wrote, and paints the same class", async () => {
    const { entries, layer } = setup();
    await run(layer, (theme) => theme.set("dark"));

    // Exactly what the boot script does, minus the layer.
    localStorage.setItem(THEME_KEY, JSON.stringify(entries.get("theme")));
    document.documentElement.classList.remove("dark");
    paint(readPreference());

    expect(readPreference()).toBe("dark");
    expect(isDark()).toBe(true);

    localStorage.removeItem(THEME_KEY);
  });

  test("an unreadable or unknown value is no choice, not a crash", () => {
    for (const raw of ["{bukan json", '"ungu"', ""]) {
      localStorage.setItem(THEME_KEY, raw);

      expect(readPreference()).toBe(DEFAULT_PREFERENCE);
    }

    localStorage.removeItem(THEME_KEY);
    expect(readPreference()).toBe(DEFAULT_PREFERENCE);
  });
});
