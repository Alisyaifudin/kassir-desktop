import { cn } from "~/lib/utils";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useZoom } from "~/hooks/use-zoom";
import { ZOOM_LEVELS, zoomIndexOf, zoomPercent, type Zoom } from "~/services/zoom";

/**
 * How large the interface is on this machine.
 *
 * A drawn slider rather than a native range input: the control has one stop per
 * level, and a real `<input type="range">` would spend most of its travel on
 * levels the app does not have — every pixel between two dots would be a scale
 * nobody can pick. So the rule and the fill are just boxes, the dots are radio
 * buttons (arrow keys work for free), and only the level labels can be chosen.
 *
 * Nothing is saved by hand: picking a dot applies it and persists it immediately,
 * so the row says so instead of pretending there is a form.
 */
export function Zoom() {
  const { zoom, pending, error, change } = useZoom();

  const count = ZOOM_LEVELS.length;
  // The dots live in equal columns, so their centres are 1/(2n) in from each edge
  // and the rule between the two outer dots is (n-1)/n of the row. The fill is
  // that rule cut at the chosen dot — at 100% it is zero and the whole line is
  // muted.
  const inset = 100 / (2 * count);
  const span = (100 * (count - 1)) / count;
  const filled = (zoomIndexOf(zoom) / (count - 1)) * span;
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <p id="app-zoom-label" className="text-base font-semibold">
              Perbesaran
            </p>
            <Spinner when={pending} />
          </div>
          <p className="text-sm text-muted-foreground">
            Berlaku langsung untuk seluruh aplikasi di mesin ini
          </p>
        </div>
        <span className="text-base font-semibold tabular-nums">{zoomPercent(zoom)}</span>
      </div>

      <div role="radiogroup" aria-labelledby="app-zoom-label" className="flex flex-col gap-2">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-muted-foreground/40"
            style={{ left: `${inset}%`, width: `${span}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground transition-[width] duration-200"
            style={{ left: `${inset}%`, width: `${filled}%` }}
          />
          <div className="relative grid" style={columns}>
            {ZOOM_LEVELS.map((level: Zoom) => (
              <div key={level} className="flex items-center justify-center">
                <input
                  id={idOf(level)}
                  type="radio"
                  name="app-zoom"
                  value={level}
                  checked={level === zoom}
                  onChange={() => void change(level)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={idOf(level)}
                  className={cn(
                    "size-10 cursor-pointer rounded-full hover:border-2 hover:border-muted-foreground/40 hover:bg-card z-10",
                    "peer-hover:border-foreground/70",
                    "peer-checked:border-foreground peer-checked:bg-foreground",
                    "peer-focus-visible:ring-2 relative group peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
                  )}
                >
                  <span className="sr-only">{zoomPercent(level)}</span>
                </label>
                <div className="size-4 border-2 bg-card rounded-full absolute z-0"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid" style={columns}>
          {ZOOM_LEVELS.map((level: Zoom) => (
            <label
              key={level}
              htmlFor={idOf(level)}
              className={cn(
                "cursor-pointer text-center text-sm",
                level === zoom ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {zoomPercent(level)}
            </label>
          ))}
        </div>
      </div>

      <TextError>{error?.message ?? null}</TextError>
    </div>
  );
}

/** One id per stop, shared by the radio, its dot and the label under it. */
function idOf(level: Zoom) {
  return `app-zoom-${zoomIndexOf(level)}`;
}
