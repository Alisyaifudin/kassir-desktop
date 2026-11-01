import { Moon, Sun } from "lucide-react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Switch } from "~/components/ui/switch";
import { useTheme } from "~/hooks/use-theme";

/**
 * Which look the app is in on this machine.
 *
 * A switch rather than a pair of radio buttons because there are two looks, and
 * the row reports which one is on screen. The stored preference can still be
 * `system` — the default — in which case the switch shows what the OS decided and
 * the row says so, so a switch that flips by itself at sunset is explained rather
 * than mysterious.
 *
 * Nothing is saved by hand: flipping it applies and persists immediately.
 */
export function Theme() {
  const { theme, preference, pending, error, change } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            {dark ? (
              <Moon aria-hidden className="size-5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Sun aria-hidden className="size-5 text-amber-600 dark:text-amber-400" />
            )}
            <p id="app-theme-label" className="text-base font-semibold">
              Mode gelap
            </p>
            <Spinner when={pending} />
          </div>
          <p className="text-sm text-muted-foreground">
            {preference === "system"
              ? "Mengikuti pengaturan tampilan sistem"
              : "Berlaku langsung untuk seluruh aplikasi di mesin ini"}
          </p>
        </div>
        <Switch
          checked={dark}
          onCheckedChange={(next) => void change(next ? "dark" : "light")}
          aria-labelledby="app-theme-label"
        />
      </div>

      <TextError>{error?.message ?? null}</TextError>
    </div>
  );
}
