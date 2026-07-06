import { Settings2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useLimit } from "./use-limit";
import { useFilters } from "./use-filters";
import { useCallback, useMemo } from "react";
import { cn } from "~/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

const UPDATED_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "7", label: "7 hari terakhir" },
  { value: "30", label: "30 hari terakhir" },
] as const;

/* ------------------------------------------------------------------ */
/*  Filter trigger button + dialog                                      */
/* ------------------------------------------------------------------ */

export function Filter() {
  const [filters, setFilters] = useFilters();
  const [limit, setLimit] = useLimit();

  /* count active filters (excluding limit) */
  const activeCount = useMemo(
    () =>
      (filters.losing ? 1 : 0) +
      (filters.emptyStock ? 1 : 0) +
      (filters.priceMin !== undefined ? 1 : 0) +
      (filters.priceMax !== undefined ? 1 : 0) +
      (filters.hasNote ? 1 : 0) +
      (filters.updatedWithin !== undefined ? 1 : 0),
    [filters],
  );

  const resetAll = useCallback(() => {
    setFilters({
      losing: false,
      emptyStock: false,
      priceMin: undefined,
      priceMax: undefined,
      hasNote: false,
      updatedWithin: undefined,
    });
    setLimit(100);
  }, [setFilters, setLimit]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative cursor-pointer shrink-0"
          aria-label="Filter produk"
        >
          <Settings2 className="icon" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm gap-0">
        <DialogHeader className="mb-0">
          <DialogTitle>Filter Produk</DialogTitle>
          <DialogDescription>
            Atur tampilan daftar produk sesuai kebutuhan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* ---- Limit ---- */}
          <Section label="Tampilan per halaman">
            <div className="flex gap-2 flex-wrap">
              {LIMIT_OPTIONS.map((n) => (
                <Button
                  key={n}
                  variant={limit === n ? "default" : "outline"}
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setLimit(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </Section>

          {/* ---- Kondisi ---- */}
          <Section label="Kondisi">
            <ToggleRow
              label="Modal rugi"
              description="Modal di atas harga jual"
              checked={filters.losing}
              onCheckedChange={(v) => setFilters({ losing: v })}
            />
            <ToggleRow
              label="Stok habis"
              description="Stok 0 atau kurang"
              checked={filters.emptyStock}
              onCheckedChange={(v) => setFilters({ emptyStock: v })}
            />
            <ToggleRow
              label="Punya catatan"
              description="Produk dengan catatan"
              checked={filters.hasNote}
              onCheckedChange={(v) => setFilters({ hasNote: v })}
            />
          </Section>

          {/* ---- Rentang Harga ---- */}
          <Section label="Rentang Harga">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={filters.priceMin ?? ""}
                onChange={(e) =>
                  setFilters({
                    priceMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground text-sm shrink-0">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={filters.priceMax ?? ""}
                onChange={(e) =>
                  setFilters({
                    priceMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </Section>

          {/* ---- Terakhir Diubah ---- */}
          <Section label="Terakhir Diubah">
            <RadioGroup
              value={filters.updatedWithin ? String(filters.updatedWithin) : ""}
              onValueChange={(v) =>
                setFilters({ updatedWithin: v ? Number(v) : undefined })
              }
            >
              {UPDATED_OPTIONS.map((opt) => (
                <Label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer font-normal"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </Label>
              ))}
            </RadioGroup>
          </Section>
        </div>

        {/* ---- Footer ---- */}
        {activeCount > 0 && (
          <div className="flex justify-end border-t pt-3 -mx-6 px-6">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1 text-muted-foreground"
              onClick={resetAll}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset semua
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label
      className={cn(
        "flex items-center justify-between gap-3 cursor-pointer py-1 rounded",
        checked && "text-foreground",
      )}
    >
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Label>
  );
}
