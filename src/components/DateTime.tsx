import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Temporal } from "temporal-polyfill";
import { monthNames } from "~/lib/date";
import { tz } from "~/lib/constants";
import { cn } from "~/lib/utils";

/**
 * A wheel date-time picker: six columns — day, month, year, hour, minute,
 * second — each showing at most three readings. The middle row is the selected
 * one; the rows above and below are what a step would take, muted, and are
 * absent when the wheel sits on its bound.
 *
 * The value is a `Temporal.PlainDateTime`: a clock face, no zone. The caller owns
 * the conversion (`plainFromEpoch` / `epochFromPlain`), so the picker cannot
 * silently re-interpret a stored instant. The year window is the current year
 * − 5 … + 1, widened if the incoming value is outside it, so a cart restored
 * from an old record still opens on its own year; the day bound follows the
 * chosen month (`31 Jan` → `28/29 Feb` constrains, it never throws).
 *
 * Input: the mouse wheel over a column, a click on its first/third row, or the
 * keyboard once the group has focus — ↑/↓ step the active column, ←/→ walk
 * day → month → year → hour → minute → second, and digits type into it (two
 * digits, four for the year). Everything clamps; a wheel is never allowed to
 * roll past its bound. Scrolling is prevented from escaping to the dialog
 * underneath.
 *
 * `max` (an optional `Temporal.PlainDateTime`) is a wall, not a fence. Nothing
 * is clamped and nothing is greyed: a reading past it is picked like any other,
 * because the operator is allowed to *say* the wrong thing and needs to see it
 * before it is committed. The picker never accuses a pick by itself — it
 * complains only once the caller sets `showError`, which is after a commit was
 * refused (or, for a control with no Simpan of its own, after focus left the
 * field via `onBlur`). The wall is a whole datetime rather than a per-column
 * number because that line prints it: `13:59`, not `13`.
 *
 * Both mouse paths move the strip with a spring (`motion`): the new reading is
 * committed at once, the strip is nudged one row so the frame does not jump,
 * and it settles into the middle. A quick flick keeps its momentum because the
 * spring is retargeted, not restarted. The keyboard steps without the spring —
 * arrow keys are the precise path, and a wheel that animates under them reads
 * as lag.
 */

type Field = "day" | "month" | "year" | "hour" | "minute" | "second";

/**
 * The columns, in reading order — which is also the ←/→ order.
 *
 * Widths are sized for what each column has to hold, not eyeballed: the label
 * (`text-sm`, 14px) is usually the wider of the two — `menit` and `bulan`
 * (which carries `September` at `text-base`, 16px) set the floor. The row height
 * is the matching class below.
 */
const FIELDS: { key: Field; label: string; gap?: boolean; width: string }[] = [
  { key: "day", label: "hari", width: "w-14" },
  { key: "month", label: "bulan", width: "w-40" },
  { key: "year", label: "tahun", width: "w-20" },
  { key: "hour", label: "jam", width: "w-12", gap: true },
  { key: "minute", label: "menit", width: "w-20" },
  { key: "second", label: "detik", width: "w-16" },
];

/**
 * A wheel row's height: one `text-base` line (16px) with room either side.
 * `leading-none` is load-bearing — the default line-height (24px) is taller than
 * the row, and three of those in a short wheel is exactly the overlap the first
 * cut shipped.
 */
const ROW_CLASS = "h-9 leading-none";

/** How long typed digits stay together before they start a new number. */
const DIGIT_TIMEOUT = 900;

/** Trackpad/mouse-wheel travel, in px, that buys one reading. */
const WHEEL_THRESHOLD = 80;

/**
 * The strip's spring. Slightly under-damped on purpose: it arrives with a hint
 * of overshoot and settles in about a tenth of a second, so a flick reads as a
 * wheel rather than as a list that teleports.
 */
const SHIFT_SPRING = { type: "spring", stiffness: 900, damping: 32, mass: 0.45 } as const;

const TWO_DIGIT: ReadonlySet<Field> = new Set(["day", "hour", "minute", "second"]);

/** One drawn reading; `null` means the column has no such row at its bound. */
type WheelRow = string | null;

function valueOf(plain: Temporal.PlainDateTime, field: Field): number {
  switch (field) {
    case "day":
      return plain.day;
    case "month":
      return plain.month;
    case "year":
      return plain.year;
    case "hour":
      return plain.hour;
    case "minute":
      return plain.minute;
    case "second":
      return plain.second;
  }
}

/**
 * `with()` defaults to `overflow: "constrain"`, which is the behaviour every
 * wheel here wants: 31 January, then February, is the 28th (or 29th).
 */
function withValue(plain: Temporal.PlainDateTime, field: Field, value: number): Temporal.PlainDateTime {
  switch (field) {
    case "day":
      return plain.with({ day: value });
    case "month":
      return plain.with({ month: value });
    case "year":
      return plain.with({ year: value });
    case "hour":
      return plain.with({ hour: value });
    case "minute":
      return plain.with({ minute: value });
    case "second":
      return plain.with({ second: value });
  }
}

function textOf(plain: Temporal.PlainDateTime, field: Field): string {
  if (field === "month") return monthNames[plain.month] ?? "";
  const value = valueOf(plain, field);
  return TWO_DIGIT.has(field) ? String(value).padStart(2, "0") : String(value);
}

/** The inclusive bounds a column may hold, anchored on today for the year. */
function rangeOf(plain: Temporal.PlainDateTime, field: Field, today: Temporal.PlainDateTime): [number, number] {
  switch (field) {
    case "day":
      return [1, plain.daysInMonth];
    case "month":
      return [1, 12];
    case "year":
      return [Math.min(today.year - 5, plain.year), Math.max(today.year + 1, plain.year)];
    case "hour":
      return [0, 23];
    case "minute":
      return [0, 59];
    case "second":
      return [0, 59];
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function step(
  plain: Temporal.PlainDateTime,
  field: Field,
  delta: 1 | -1,
  today: Temporal.PlainDateTime,
): Temporal.PlainDateTime {
  const [min, max] = rangeOf(plain, field, today);
  return withValue(plain, field, clamp(valueOf(plain, field) + delta, min, max));
}

/**
 * Is this reading past the wall? The one comparison the picker makes to complain
 * and the caller makes to hold its commit, so the two can never disagree.
 */
export function isFuture(
  value: Temporal.PlainDateTime,
  max: Temporal.PlainDateTime | undefined,
): boolean {
  return max !== undefined && Temporal.PlainDateTime.compare(value, max) > 0;
}

/**
 * The complaint, naming the wall the way it is picked: `<YYYY mmmm DD, HH.MM>`.
 * The seconds are left off on purpose — they are the picker's finest column and
 * nobody reads a wall to the second.
 */
export function futureTimeError(max: Temporal.PlainDateTime): string {
  const day = String(max.day).padStart(2, "0");
  const hour = String(max.hour).padStart(2, "0");
  const minute = String(max.minute).padStart(2, "0");
  return `Tidak bisa memilih waktu di masa depan setelah ${max.year} ${monthNames[max.month]} ${day}, ${hour}.${minute}`;
}

export function DateTime({
  value,
  max,
  showError = false,
  onBlur,
  onChange,
  className,
}: {
  value: Temporal.PlainDateTime;
  /**
   * The wall, if any: a reading past it stays pickable, and `isFuture` is the
   * comparison the caller uses to hold its commit.
   */
  max?: Temporal.PlainDateTime;
  /**
   * Reveal the wall's complaint. Off until the caller has something to refuse:
   * a pick is never accused while it is still being made.
   */
  showError?: boolean;
  /** Focus left the group — the only "done" a picker with no submit has. */
  onBlur?: () => void;
  onChange: (value: Temporal.PlainDateTime) => void;
  className?: string;
}) {
  // The year window is anchored once per mount: nothing good comes from it
  // moving while the operator scrolls.
  const today = useMemo(() => Temporal.Now.plainDateTimeISO(tz), []);
  const [active, setActive] = useState<Field>("day");
  const [focused, setFocused] = useState(false);
  const digits = useRef<{ field: Field; text: string; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  // Emitting updates the ref before React re-renders: a fast wheel fires several
  // events per frame, and each step must chain from the previous one rather than
  // from the value the last render saw.
  const valueRef = useRef(value);
  valueRef.current = value;
  const todayRef = useRef(today);
  todayRef.current = today;

  /** Emit only a real move: a clamped edge emits an equal value, not a write. */
  function emit(next: Temporal.PlainDateTime) {
    if (next.equals(valueRef.current)) return;
    valueRef.current = next;
    onChange(next);
  }

  /** One step of a column — the shared path for arrow keys and the wheels. */
  function stepOnce(field: Field, delta: 1 | -1) {
    const next = step(valueRef.current, field, delta, todayRef.current);
    if (next.equals(valueRef.current)) return;
    setActive(field);
    emit(next);
  }

  useEffect(() => {
    return () => {
      if (digits.current !== null) clearTimeout(digits.current.timer);
    };
  }, []);

  function typeDigit(digit: string) {
    const field = active;
    const previous = digits.current !== null && digits.current.field === field ? digits.current.text : "";
    if (digits.current !== null) clearTimeout(digits.current.timer);
    const limit = field === "year" ? 4 : 2;
    const text = (previous + digit).slice(-limit);
    const timer = setTimeout(() => {
      digits.current = null;
    }, DIGIT_TIMEOUT);
    digits.current = { field, text, timer };
    const [min, hardMax] = rangeOf(valueRef.current, field, todayRef.current);
    emit(withValue(valueRef.current, field, clamp(Number(text), min, hardMax)));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const index = FIELDS.findIndex((field) => field.key === active);
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        stepOnce(active, -1);
        return;
      case "ArrowDown":
        event.preventDefault();
        stepOnce(active, 1);
        return;
      case "ArrowLeft": {
        event.preventDefault();
        const next = FIELDS[Math.max(0, index - 1)];
        if (next !== undefined) setActive(next.key);
        return;
      }
      case "ArrowRight": {
        event.preventDefault();
        const next = FIELDS[Math.min(FIELDS.length - 1, index + 1)];
        if (next !== undefined) setActive(next.key);
        return;
      }
      default:
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          typeDigit(event.key);
        }
    }
  }

  // The wall is the caller's and the moment to speak is the caller's: nothing
  // here is clamped, and the complaint waits for `showError`.
  const error = showError && max !== undefined && isFuture(value, max) ? futureTimeError(max) : null;
  const errorId = useId();

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="group"
        tabIndex={0}
        aria-label="Waktu"
        aria-invalid={error === null ? undefined : true}
        aria-describedby={error === null ? undefined : errorId}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          setFocused(false);
          onBlur?.();
        }}
        className={cn(
          "flex items-start gap-3 self-start rounded-lg border bg-muted/20 px-3 py-2 outline-none",
          focused && "ring-1 ring-primary/40",
          className,
        )}
      >
        {FIELDS.map((field) => {
          const [min, hardMax] = rangeOf(value, field.key, today);
          const current = valueOf(value, field.key);
          // The column's own bound is the calendar's, never the wall's: a reading
          // past the wall is still reachable — the error line is what stops it
          // from being committed.
          const previous = step(value, field.key, -1, today);
          const next = step(value, field.key, 1, today);
          const rows: WheelRow[] = [
            current > min ? textOf(previous, field.key) : null,
            textOf(value, field.key),
            current < hardMax ? textOf(next, field.key) : null,
          ];
          return (
            <Wheel
              key={field.key}
              field={field.key}
              label={field.label}
              width={field.width}
              gap={field.gap === true}
              min={min}
              max={hardMax}
              current={current}
              rows={rows}
              active={focused && active === field.key}
              onSelect={() => setActive(field.key)}
              onStep={(delta) => stepOnce(field.key, delta)}
            />
          );
        })}
      </div>
      {error === null ? null : (
        <p id={errorId} role="alert" className="max-w-xs text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * One column. It owns its strip's motion: the spring is what turns a wheel event
 * or an edge-row click into a movement instead of a jump, and owning it here
 * keeps six columns from sharing one offset.
 */
function Wheel({
  field,
  label,
  width,
  gap,
  min,
  max,
  current,
  rows,
  active,
  onSelect,
  onStep,
}: {
  field: Field;
  label: string;
  width: string;
  gap: boolean;
  min: number;
  max: number;
  current: number;
  rows: WheelRow[];
  active: boolean;
  onSelect: () => void;
  onStep: (delta: 1 | -1) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Row units, not pixels: the strip is exactly three rows tall, so one row is
  // 1/3 of it and the transform stays correct when the type scale changes.
  // Bound as `transform`, not `y`: `y` takes pixels, and a percentage there is
  // silently dropped, which is a wheel that never moves.
  const shift = useMotionValue(0);
  const transform = useTransform(shift, (row) => `translateY(${(row * 100) / 3}%)`);
  const settle = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(
    () => () => {
      settle.current?.stop();
    },
    [],
  );

  /** Move the strip one row with the commit, then spring it back to rest. */
  function nudge(delta: 1 | -1) {
    if (reduceMotion) return;
    const velocity = shift.getVelocity();
    shift.jump(shift.get() + delta);
    settle.current?.stop();
    settle.current = animate(shift, 0, { ...SHIFT_SPRING, velocity });
  }

  /** A step, refused only when the column has no row there (its hard bound). */
  function requestStep(delta: 1 | -1) {
    if ((delta === 1 ? rows[2] : rows[0]) === null) return;
    nudge(delta);
    onStep(delta);
  }
  // The wheel listener is attached once, so it reads the step through a ref.
  const requestRef = useRef(requestStep);
  requestRef.current = requestStep;

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    // `wheel` must be non-passive to keep the dialog from scrolling under the
    // pointer — React's synthetic listener is passive, so bind it by hand.
    let accumulated = 0;
    const handler = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      // One notch of a mouse is ~100px; a trackpad flick is a stream of small
      // deltas. Step once per threshold of travel so both feel the same, and
      // keep the remainder so a flick keeps going. Some mice report lines or
      // pages instead of pixels, which would need dozens of notches otherwise.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      accumulated += event.deltaY * unit;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;
      const delta: 1 | -1 = accumulated > 0 ? 1 : -1;
      accumulated -= delta * WHEEL_THRESHOLD;
      requestRef.current(delta);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-1", width, gap && "ml-2")}>
      <span className="text-sm leading-none text-muted-foreground select-none">{label}</span>
      <div
        ref={ref}
        id={`date-time-${field}`}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={rows[1] ?? ""}
        data-active={active ? "true" : "false"}
        onClick={onSelect}
        className={cn(
          "relative w-full overflow-hidden rounded-md",
          active && "bg-primary/10 ring-1 ring-primary/40",
        )}
      >
        <motion.div data-slide={field} className="flex flex-col gap-2" style={{ transform }}>
          {rows.map((row, index) =>
            row === null ? (
              <span key={index} aria-hidden className={cn("block", ROW_CLASS)} />
            ) : (
              <div
                key={index}
                onClick={(event) => {
                  if (index === 1) {
                    onSelect();
                    return;
                  }
                  event.stopPropagation();
                  requestStep(index === 0 ? -1 : 1);
                }}
                className={cn(
                  "flex items-center justify-center text-base tabular-nums select-none",
                  ROW_CLASS,
                  index === 1 && "font-semibold text-foreground",
                  index !== 1 && "cursor-pointer text-sm text-muted-foreground/60",
                )}
              >
                {row}
              </div>
            ),
          )}
        </motion.div>
      </div>
    </div>
  );
}
