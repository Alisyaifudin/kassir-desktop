import { useEffect, useState } from "react";
import { Kbd } from "~/components/ui/kdb";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { SELECTED_RING } from "~/components/cart/z-Cell";

/**
 * A select as a grid cell: shows its label until entered, then opens the menu.
 * Clicking the cell edits in one click; the arrows keep it closed until Enter.
 *
 * Kept beside `z-Cell` rather than inside the payment strip because it is the
 * one cell that owns a portal, and the portal is where its rules live.
 */
export function SelectCell({
  id,
  className,
  label,
  selected,
  editing,
  value,
  options,
  onSelect,
  onEditingDone,
  onChange,
}: {
  id: string;
  className?: string;
  label: string;
  selected: boolean;
  editing: boolean;
  value: string;
  options: readonly { value: string; label: string; kbd?: string }[];
  onSelect: () => void;
  onEditingDone: () => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (editing) setOpen(true);
  }, [editing]);

  const display = options.find((option) => option.value === value)?.label ?? value;
  return (
    <div
      id={id}
      onClick={(event) => {
        // The menu portals out of this cell, but React still bubbles its clicks
        // back through the tree. Choosing an option with a mouse fires *both*:
        // Radix selects on `pointerup` and closes, then the trailing `click`
        // arrives here — after the render that ended editing, so `editing`
        // already reads false — and this cell would ask to edit again, which
        // reopens the menu it just closed. Only a click that started inside the
        // cell counts. (Keys need the same guard for the same reason; see the
        // grid's `handleKeyDown`.)
        if (!event.currentTarget.contains(event.target as Node)) return;
        if (!editing) onSelect();
      }}
      className={cn(
        "flex flex-col justify-center gap-0.5 px-2 py-1",
        className,
        selected && (editing ? "z-10 ring-2 ring-primary ring-inset" : SELECTED_RING),
      )}
    >
      <span className="text-sm leading-none text-muted-foreground select-none">{label}</span>
      <Select
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onEditingDone();
        }}
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-9 w-full border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0">
          <SelectValue>{display}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                className=" w-[250px]"
                key={option.value}
                value={option.value}
                kbd={option.kbd === undefined ? undefined : <Kbd>{option.kbd}</Kbd>}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
