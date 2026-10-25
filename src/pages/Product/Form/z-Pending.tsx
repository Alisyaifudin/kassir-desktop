import { NumberField } from "~/components/NumberField";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

/**
 * A field's value slot before its value arrives.
 *
 * The *real* control is drawn, disabled and empty, with its own box painted as
 * the skeleton — which is the only way a placeholder is never a guessed size. An
 * input is input-height, a `rows={3}` textarea is three lines tall, a combobox
 * keeps its chevron and its padding, and every one of them is right at both app
 * sizes, because no pixel value here is mine.
 *
 * The box is painted rather than overlaid: `animate-pulse` on a `bg-muted` box
 * reads as "a value goes here" without a second element to keep in sync with the
 * control underneath it. The control keeps its placeholder, since that is what an
 * empty one looks like — the placeholder is static text, not a value.
 */
const BOX = "animate-pulse bg-muted";

export function PendingInput({ type, placeholder }: { type?: string; placeholder?: string }) {
  return <Input type={type} disabled placeholder={placeholder} className={BOX} />;
}

/** A number field's box: the same `NumberField` the form uses, holding no number. */
export function PendingNumber({ placeholder }: { placeholder?: string } = {}) {
  return (
    <NumberField value="" onValueChange={noop} disabled placeholder={placeholder} className={BOX} />
  );
}

export function PendingTextarea({
  rows = 3,
  placeholder,
}: {
  rows?: number;
  placeholder?: string;
}) {
  return <Textarea rows={rows} disabled placeholder={placeholder} className={BOX} />;
}

/**
 * A combobox trigger holding no choice. Its options are irrelevant while nothing
 * is chosen, so only what is *visible* — the placeholder and the aria label — is
 * passed through.
 */
export function PendingCombobox({
  options,
  placeholder,
  ariaLabel,
}: {
  options: readonly ComboboxOption[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <Combobox
      value=""
      onValueChange={noop}
      options={options}
      placeholder={placeholder}
      disabled
      aria-label={ariaLabel}
      className={cn(BOX, "rounded-md")}
    />
  );
}

function noop() {}
