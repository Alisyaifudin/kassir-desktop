import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { InputCurrency } from "~/components/ui/input-currency";
import { InputPercent } from "~/components/ui/input-percent";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { generateId } from "~/lib/random";
import { lineSubtotal, recalcDiscounts } from "../total";
import { rupiah } from "../util-rupiah";
import type { DiscountKind, DiscountLine, Line } from "../mock";

/** start column of value, kind, eff, x (no# is column 0). */
const COLUMNS = [1, 4, 7, 10];
const SELECTED_RING = "z-10 ring-1 ring-primary ring-inset";
const EDITING_RING = "z-10 ring-2 ring-primary ring-inset";
const EDIT_CLASS =
  "h-9 rounded-none border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7";

const KIND_LABELS: Record<DiscountKind, string> = {
  number: "Angka",
  percent: "Persen",
  pcs: "PCS",
};

function blankDiscount(): DiscountLine {
  return { id: generateId(), value: 0, kind: "percent", eff: 0, total: 0 };
}

/** Keep exactly one empty line at the end. */
function normalize(lines: DiscountLine[]): DiscountLine[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1].value === 0) end--;
  const trailing = lines[end];
  return [...lines.slice(0, end), trailing ?? blankDiscount()];
}

const cellIndexOf = (col: number) => (col >= 10 ? 3 : col >= 7 ? 2 : col >= 4 ? 1 : 0);

function formatValue(discount: DiscountLine): string {
  if (discount.value === 0) return "";
  switch (discount.kind) {
    case "number":
      return rupiah(discount.value);
    case "percent":
      return `${discount.value}%`;
    case "pcs":
      return String(discount.value);
  }
}

export function DiscountDialog({
  open,
  onOpenChange,
  line,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: Line | null;
  onChange: (discounts: DiscountLine[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-big font-bold">Diskon</DialogTitle>
        </DialogHeader>
        {line !== null ? (
          <Body
            key={line.id}
            line={line}
            onChange={onChange}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  line,
  onChange,
  onClose,
}: {
  line: Line;
  onChange: (discounts: DiscountLine[]) => void;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState(() => ({
    row: Math.max(0, line.discounts.length - 1),
    col: COLUMNS[0],
  }));
  const [editing, setEditing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const kindRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const row = Math.min(selection.row, line.discounts.length - 1);
  const cell = cellIndexOf(selection.col);
  const canDelete = line.discounts.some((discount) => discount.value > 0);

  useEffect(() => {
    if (editing) return;
    containerRef.current?.focus();
  }, [selection, editing]);

  function commit(next: DiscountLine[]) {
    onChange(recalcDiscounts(line.price, line.qty, normalize(next)));
  }

  function setValue(index: number, value: number) {
    commit(line.discounts.map((d, i) => (i === index ? { ...d, value } : d)));
  }

  function setKind(index: number, kind: DiscountKind) {
    commit(line.discounts.map((d, i) => (i === index ? { ...d, kind } : d)));
  }

  function remove(index: number) {
    if (!canDelete) return;
    commit(line.discounts.filter((_, i) => i !== index));
  }

  function moveVertical(delta: number) {
    setSelection((s) => ({ row: Math.min(Math.max(s.row + delta, 0), line.discounts.length - 1), col: s.col }));
    setEditing(false);
  }

  function moveHorizontal(delta: number) {
    const index = Math.min(Math.max(cellIndexOf(selection.col) + delta, 0), COLUMNS.length - 1);
    setSelection((s) => ({ ...s, col: COLUMNS[index] }));
    setEditing(false);
  }

  function activate() {
    if (cell === 0) {
      setEditing(true);
      return;
    }
    if (cell === 1) {
      kindRefs.current[row]?.click();
      return;
    }
    if (cell === 3) remove(row);
  }

  function handleValueKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setEditing(false);
    }
    if (event.key === "Enter") setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        moveVertical(-1);
        return;
      case "ArrowDown":
        event.preventDefault();
        moveVertical(1);
        return;
      case "ArrowLeft":
        event.preventDefault();
        moveHorizontal(-1);
        return;
      case "ArrowRight":
        event.preventDefault();
        moveHorizontal(1);
        return;
      case "Enter":
        event.preventDefault();
        activate();
        return;
      case "Escape":
        event.preventDefault();
        onClose();
        return;
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col outline-none"
    >
      <div className="flex justify-end border-b py-2">
        <span className="text-big font-bold tabular-nums">{rupiah(lineSubtotal(line))}</span>
      </div>

      <div className="divide-y divide-border">
        {line.discounts.map((discount, index) => {
          const onRow = index === row;
          return (
            <div key={discount.id} className="grid grid-cols-11 items-stretch">
              <div className="col-span-1 flex items-center justify-center text-normal text-muted-foreground tabular-nums select-none">
                {index + 1}
              </div>

              <div
                onClick={() => {
                  if (editing) return;
                  setSelection({ row: index, col: COLUMNS[0] });
                  setEditing(false);
                }}
                onDoubleClick={() => {
                  setSelection({ row: index, col: COLUMNS[0] });
                  setEditing(true);
                }}
                className={cn(
                  "col-span-3 flex items-center border-l px-2 py-1",
                  onRow && cell === 0 && (editing ? EDITING_RING : SELECTED_RING),
                )}
              >
                {onRow && cell === 0 && editing ? (
                  discount.kind === "number" ? (
                    <InputCurrency
                      autoFocus
                      value={discount.value}
                      onValueChange={(value) => setValue(index, value)}
                      className={EDIT_CLASS}
                      onBlur={() => setEditing(false)}
                      onKeyDown={handleValueKeyDown}
                    />
                  ) : discount.kind === "percent" ? (
                    <InputPercent
                      autoFocus
                      value={discount.value}
                      min={0}
                      max={100}
                      onValueChange={(value) => setValue(index, value)}
                      className={EDIT_CLASS}
                      onBlur={() => setEditing(false)}
                      onKeyDown={handleValueKeyDown}
                    />
                  ) : (
                    <Input
                      autoFocus
                      inputMode="numeric"
                      value={discount.value === 0 ? "" : String(discount.value)}
                      onChange={(event) =>
                        setValue(index, Number(event.currentTarget.value.replace(/\D/g, "")) || 0)
                      }
                      className={cn(EDIT_CLASS, "text-right")}
                      onBlur={() => setEditing(false)}
                      onKeyDown={handleValueKeyDown}
                    />
                  )
                ) : (
                  <button type="button" tabIndex={-1} className="w-full text-right text-normal select-none">
                    {formatValue(discount)}
                  </button>
                )}
              </div>

              <div
                onClick={() => {
                  setSelection({ row: index, col: COLUMNS[1] });
                  setEditing(false);
                }}
                className={cn(
                  "col-span-3 flex items-center border-l px-2 py-1",
                  onRow && cell === 1 && SELECTED_RING,
                )}
              >
                <Select
                  value={discount.kind}
                  onValueChange={(kind) => {
                    setKind(index, kind as DiscountKind);
                    setEditing(false);
                  }}
                >
                  <SelectTrigger
                    ref={(el) => {
                      kindRefs.current[index] = el;
                    }}
                    className="h-9 w-full border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7"
                  >
                    <SelectValue>{KIND_LABELS[discount.kind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="number">Angka</SelectItem>
                      <SelectItem value="percent">Persen</SelectItem>
                      <SelectItem value="pcs">PCS</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div
                onClick={() => {
                  setSelection({ row: index, col: COLUMNS[2] });
                  setEditing(false);
                }}
                className={cn(
                  "col-span-3 flex items-center justify-end border-l px-2 py-1 text-normal tabular-nums select-none",
                  onRow && cell === 2 && SELECTED_RING,
                )}
              >
                {discount.eff > 0 ? `-${rupiah(discount.eff)}` : ""}
              </div>

              <div
                onClick={() => {
                  setSelection({ row: index, col: COLUMNS[3] });
                  setEditing(false);
                }}
                className={cn(
                  "col-span-1 flex items-center justify-center border-l",
                  onRow && cell === 3 && SELECTED_RING,
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-destructive hover:text-primary-foreground"
                  title="Hapus diskon"
                  disabled={!canDelete}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(index);
                  }}
                >
                  <X className="icon" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
