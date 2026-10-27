import { useEffect } from "react";
import { Kbd } from "~/components/ui/kdb";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { MODE_NAMES } from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { RecordMode } from "~/services/record";

const MODES = [
  { value: "incoming", label: MODE_NAMES.incoming },
  { value: "outcoming", label: MODE_NAMES.outcoming },
] as const;

/** The only two directions, so the other one is the whole toggle. */
const flip = (mode: RecordMode): RecordMode => (mode === "incoming" ? "outcoming" : "incoming");

/**
 * Masuk or Keluar, as one switch: the chosen half carries the primary ground and
 * the indicator slides across when the other is picked.
 *
 * A `radiogroup` rather than a select — two mutually exclusive options with one
 * visible at a time do not need a menu, and the state stays readable without
 * opening anything. Arrow keys flip it, like a native radio pair; F3 does the
 * same from anywhere on the screen.
 */
export function ModeSwitch({
  value,
  onChange,
}: {
  value: RecordMode;
  onChange: (mode: RecordMode) => void;
}) {
  const index = Math.max(
    0,
    MODES.findIndex((mode) => mode.value === value),
  );
  // F3 flips the direction from anywhere on the screen. A dialog owns the
  // keyboard while it is open, so the shortcut waits for it to close.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F3" || isScreenOwnedByDialog()) return;
      event.preventDefault();
      onChange(flip(value));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value, onChange]);

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Jenis transaksi"
        aria-keyshortcuts="F3"
        title="Jenis transaksi (F3)"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          onChange(flip(value));
        }}
        className="relative flex shrink-0 rounded-md border bg-muted p-0.5"
      >
        {/* The sliding ground: half the track, moved by its own width. */}
        <span
          aria-hidden="true"
          style={{ transform: `translateX(${index * 100}%)` }}
          className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-sm bg-primary transition-transform duration-200 ease-out"
        />
        {MODES.map((mode) => {
          const active = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(mode.value)}
              className={cn(
                "relative z-10 min-w-[104px] rounded-sm px-3 py-1.5 text-base transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
      <Kbd>F3</Kbd>
    </>
  );
}
