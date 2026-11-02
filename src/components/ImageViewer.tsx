import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useImageUrl } from "~/hooks/use-image";
import { cn } from "~/lib/utils";
import type { Mime } from "~/services/product";

/** One stored photo, in the only shape every caller has: a file and its type. */
export type ViewerImage = { name: string; mime: Mime };

/** How far a photo has to be dragged before letting go counts as a swipe. */
const SWIPE_DISTANCE = 56;
/** …or how fast a short flick has to be thrown to mean the same thing. */
const SWIPE_VELOCITY = 500;
/** How long a photo takes to leave and the next one to take its place. */
const SLIDE_SECONDS = 0.18;

/**
 * Which way a release points, as a step through the gallery: `1` for the next
 * photo, `-1` for the previous one, `0` for "that was not a swipe".
 *
 * A drag far enough counts on its own; a flick counts at a fraction of the
 * distance, because a photo is thrown rather than pushed. A flick that ran
 * against the drag it ended does not count at all — that is the same hand
 * coming back, not a change of mind.
 */
export function swipeStep(offsetX: number, velocityX: number): -1 | 0 | 1 {
  if (offsetX === 0) return 0;
  const forward = offsetX < 0;
  const flicked =
    Math.abs(velocityX) >= SWIPE_VELOCITY && Math.sign(velocityX) === Math.sign(offsetX);
  if (!flicked && Math.abs(offsetX) < SWIPE_DISTANCE) return 0;
  return forward ? 1 : -1;
}

/**
 * A product's photos: one big carousel on top, the strip of everything it holds
 * underneath. Clicking a thumbnail is the same move as the arrows — the big frame
 * follows the strip, never the other way around, so the strip is always the map
 * of what is there and the frame is where you are on it.
 *
 * The photos are files on disk, not URLs in a row: each frame resolves its own
 * object URL as it is shown (see `useImageUrl`), and the strip resolves one per
 * tile, so a gallery of eight photos never holds eight decoded images in memory
 * just to draw five thumbnails.
 *
 * The frame is also the way through: it can be dragged left and right like a page,
 * which is the gesture a photo invites, and the arrows stay for the people who
 * would rather not. A release only ever moves one photo — a fast throw across the
 * frame must not skip three — and the one leaving continues in the direction it
 * was pushed while the next comes in behind it.
 *
 * One photo is not a carousel: with nothing to move to, the arrows, the counter,
 * the strip and the drag stay out of the way and the frame takes the whole panel.
 */
export function ImageViewer({
  images,
  label = "Gambar",
  className,
}: {
  images: ViewerImage[];
  /** What the photos are of — the product's name, for a screen reader. */
  label?: string;
  className?: string;
}) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  // Which way the last move went, so the photo coming in knows which edge to
  // come from and the one leaving knows which edge to leave by.
  const [direction, setDirection] = useState(1);

  // The set can change under a mounted gallery — the sheet is reused for the next
  // product, a photo is deleted on the product screen. Keyed on the names rather
  // than the array, because the parent re-creates the array on every render and a
  // new `[]` is not a new gallery.
  const key = images.map((image) => image.name).join("\n");
  useEffect(() => {
    setIndex(0);
    // A gallery that starts over also comes in from the right, the way a first
    // photo always does — not backwards, from whatever the last move left behind.
    setDirection(1);
  }, [key]);

  // Never past the end: the clamped index is the one frame, counter and ring all
  // read, so a shrunken set cannot leave the stage empty.
  const active = count === 0 ? -1 : Math.min(index, count - 1);
  const shown = active === -1 ? null : (images[active] ?? null);

  /** Move one photo, remembering which way — and nowhere at all from either end. */
  function move(step: number) {
    if (step === 0) return;
    const next = clamp(active + step, count);
    if (next === active) return;
    setDirection(step < 0 ? -1 : 1);
    setIndex(next);
  }

  /** Jump straight to a photo: the strip's tiles, and the two arrows. */
  function select(position: number) {
    if (position === active) return;
    setDirection(position > active ? 1 : -1);
    setIndex(clamp(position, count));
  }

  function handleDragEnd(_event: unknown, info: PanInfo) {
    move(swipeStep(info.offset.x, info.velocity.x));
  }

  /**
   * Left and right are read from the window, not from a focus ring on the frame:
   * the gallery is only ever mounted inside a dialog of its own, and Radix hands
   * that dialog's first Tab target the focus when it opens — a carousel that
   * answers the arrows only after it is clicked is a carousel nobody drives.
   *
   * A field that has a caret of its own keeps its arrows, and so does any key a
   * nearer handler already took.
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target !== null) {
        if (target.isContentEditable) return;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"
        ) {
          return;
        }
      }
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight":
        case "Home":
        case "End": {
          if (count < 2) return;
          event.preventDefault();
          if (event.key === "Home") setIndex(0);
          else if (event.key === "End") setIndex(count - 1);
          else {
            const delta = event.key === "ArrowLeft" ? -1 : 1;
            setIndex((prev) => clamp(clamp(prev, count) + delta, count));
          }
          return;
        }
        default:
          return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [count]);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("flex min-h-0 flex-col gap-2", className)}
    >
      <div className="relative flex h-[min(60vh,30rem)] min-h-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30 select-none">
        {shown === null ? (
          <div className="flex flex-col items-center gap-2">
            <ImageOff className="size-8 text-muted-foreground/40" />
            <p className="text-sm">Belum ada gambar.</p>
          </div>
        ) : (
          // `custom` carries the direction to the photo on its way out too: that
          // one was rendered before this move, so the arrow it leaves by has to
          // come from the carousel now, not from the props it was born with.
          <AnimatePresence initial={false} custom={direction}>
            <Frame
              key={shown.name}
              image={shown}
              label={`Gambar ${active + 1} dari ${count}`}
              direction={direction}
              draggable={count > 1}
              onDragEnd={handleDragEnd}
            />
          </AnimatePresence>
        )}

        {count > 1 ? (
          <>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Gambar sebelumnya"
              className="absolute top-1/2 left-2 -translate-y-1/2"
              disabled={active <= 0}
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Gambar berikutnya"
              className="absolute top-1/2 right-2 -translate-y-1/2"
              disabled={active === count - 1}
              onClick={() => move(1)}
            >
              <ChevronRight className="size-5" />
            </Button>
            <span
              aria-hidden
              className="absolute right-2 bottom-2 rounded-md border bg-background/90 px-2 py-0.5 text-xs tabular-nums"
            >
              {active + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto p-1">
          {images.map((image, position) => (
            <Thumb
              key={image.name}
              image={image}
              number={position + 1}
              selected={position === active}
              onSelect={() => select(position)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function clamp(index: number, count: number): number {
  return Math.max(0, Math.min(index, count - 1));
}

/**
 * The big one. `object-contain` and not `object-cover`: a product photo is read to
 * recognise the goods, and cropping the edges off the packaging to fill a frame
 * makes the frame prettier and the photo useless.
 *
 * The whole frame is the drag surface, not just the photo inside it: a photo with
 * a wide margin is still a photo you reach for. `dragConstraints` of nothing on
 * either side turns the drag into a rubber band around the current photo — it
 * follows the hand and springs back on its own unless the release was a swipe, in
 * which case the carousel has already told it to leave by that same edge.
 *
 * `draggable={false}` on the `<img>` keeps the webview's own image drag out of it:
 * a photo ghost dragged off the frame would never reach the carousel at all.
 */
function Frame({
  image,
  label,
  direction,
  draggable,
  onDragEnd,
}: {
  image: ViewerImage;
  label: string;
  /** `1` when this photo came in from the right, `-1` from the left. */
  direction: number;
  draggable: boolean;
  onDragEnd: (event: unknown, info: PanInfo) => void;
}) {
  const url = useImageUrl(image.name, image.mime);

  return (
    <motion.div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      custom={direction}
      variants={{
        enter: (towards: number) => ({ x: `${towards * 100}%`, opacity: 0 }),
        stay: { x: "0%", opacity: 1 },
        leave: (towards: number) => ({ x: `${-towards * 100}%`, opacity: 0 }),
      }}
      initial="enter"
      animate="stay"
      exit="leave"
      transition={{ duration: SLIDE_SECONDS, ease: "easeOut" }}
      drag={draggable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 420, bounceDamping: 34 }}
      onDragEnd={onDragEnd}
    >
      {url === null ? (
        <Skeleton className="size-16" />
      ) : (
        <img src={url} alt={label} draggable={false} className="size-full object-contain" />
      )}
    </motion.div>
  );
}

/** One tile of the strip: the same photo, small, and the way to put it up top. */
function Thumb({
  image,
  number,
  selected,
  onSelect,
}: {
  image: ViewerImage;
  number: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const url = useImageUrl(image.name, image.mime);
  const ref = useRef<HTMLButtonElement>(null);

  // With more photos than fit, the ring has to be where the eye is looking: an
  // arrow key that moves the frame to a photo scrolled off the strip would hide
  // the very thing it just proved.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Gambar ${number}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted/30 transition",
        selected ? "border-transparent ring-2 ring-primary" : "opacity-70 hover:opacity-100",
      )}
    >
      {url !== null ? <img src={url} alt="" className="size-full object-cover" /> : null}
    </button>
  );
}
