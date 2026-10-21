import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { cn } from "~/lib/utils";
import type { ExtraPreset } from "../types";
import { rupiah } from "../util-rupiah";

/**
 * The charge presets under a search query, replacing the extra rows. Unlike the
 * listing search these are names, not products, so there is no cover to show —
 * just what the charge is and what it defaults to.
 *
 * Arrows move a selection, Enter (or a click) adds the preset, and Up from the
 * top row returns to the search field.
 */
export function ExtraSearch({
  presets,
  containerRef,
  onPick,
  onExit,
}: {
  presets: ExtraPreset[];
  containerRef: RefObject<HTMLDivElement | null>;
  onPick: (preset: ExtraPreset) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);

  // A new query starts again from the first result.
  useEffect(() => setSelected(0), [presets]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (presets.length === 0) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (selected === 0) onExit();
        else setSelected((index) => Math.max(index - 1, 0));
        return;
      case "ArrowDown":
        event.preventDefault();
        setSelected((index) => Math.min(index + 1, presets.length - 1));
        return;
      case "Enter":
        event.preventDefault();
        if (presets[selected] !== undefined) onPick(presets[selected]);
        return;
      case "Escape":
        event.preventDefault();
        onExit();
        return;
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="min-h-0 flex-1 overflow-y-auto outline-none"
    >
      {presets.length === 0 ? (
        <p className="p-4 text-muted-foreground select-none">Tidak ada biaya.</p>
      ) : (
        <div className="divide-y divide-border">
          {presets.map((preset, index) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPick(preset)}
              onMouseEnter={() => setSelected(index)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50",
                index === selected && "bg-primary/10",
              )}
            >
              <span className="min-w-0 truncate text-normal font-medium">{preset.name}</span>
              <span className="shrink-0 text-normal tabular-nums text-muted-foreground">
                {preset.kind === "percent" ? `${preset.value}%` : rupiah(preset.value)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
