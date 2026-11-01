import { Effect, Either } from "effect";
import { useEffect, useState } from "react";
import { useMutation, useStream } from "~/components/Loader";
import { service } from "~/services";
import { DEFAULT_PREFERENCE, resolveTheme, type ThemePreference } from "~/services/theme";

/**
 * The app's theme.
 *
 * The service's stream is the truth — it is what the boot-time apply read, and
 * what `set` echoes once the preference is painted and stored. `theme` is the
 * look that is actually on screen, which for the default `system` preference is
 * whatever the OS says right now; `preference` is what the operator chose, so the
 * row can say when it is following the system.
 *
 * The choice also moves locally the moment the switch does, so the knob tracks
 * the pointer instead of waiting for the round trip; it is put back on the stored
 * preference if the write was refused, so the switch can only ever show a
 * preference the app actually holds.
 */
export function useTheme() {
  const res = useStream(service.theme.changes, () => Effect.runSync(service.theme.get()));
  const stored = res.type === "success" ? res.data : DEFAULT_PREFERENCE;
  const { pending, error, mutate } = useMutation(service.theme.set);

  const [chosen, setChosen] = useState<ThemePreference | null>(null);
  useEffect(() => setChosen(null), [stored]);

  // A `system` preference has to survive the OS switching under a running app.
  const systemDark = useSystemDark();

  const preference = chosen ?? stored;
  const theme = resolveTheme(preference, systemDark);

  async function change(next: ThemePreference) {
    setChosen(next);
    const either = await mutate(next);
    if (Either.isLeft(either)) setChosen(null);
  }

  return { theme, preference, pending, error, change };
}

/** Whether the OS is in dark mode, kept current while the app runs. */
function useSystemDark(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const read = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [dark, setDark] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const onChange = () => setDark(media.matches);
    setDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return dark;
}
