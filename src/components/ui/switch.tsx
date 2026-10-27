import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * An on/off switch, as in shadcn's `Switch` but without the Radix dependency:
 * a `role="switch"` button whose knob slides on `checked`.
 *
 * The caller owns the state — pair it with `aria-label` or a `<label>` that
 * names what is being switched, since the track carries no text of its own.
 */
const Switch = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    data-state={checked ? "checked" : "unchecked"}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      "",
      className,
    )}
    {...props}
  >
    <span
      aria-hidden
      className={cn(
        "pointer-events-none block size-5 rounded-full bg-background shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0",
      )}
    />
  </button>
));
Switch.displayName = "Switch";

export { Switch };
