import { Plus, Trash2 } from "lucide-react";
import { ForEach } from "~/components/ForEach";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { METHOD_NAMES } from "~/lib/constants";
import type { MethodRow } from "./use-edit";

export type MethodGroup = {
  kind: keyof typeof METHOD_NAMES;
  base: { id: string; name: string | null } | null;
  variants: { id: string; name: string | null }[];
};

export function MethodRows({
  rows,
  groups,
  paid,
  disabled,
  lockAmounts,
  canSplit,
  addRow,
  removeRow,
  setRow,
}: {
  rows: MethodRow[];
  groups: MethodGroup[];
  paid: number;
  disabled: boolean;
  lockAmounts: boolean;
  canSplit: boolean;
  addRow: () => void;
  removeRow: (index: number) => void;
  setRow: (index: number, row: Partial<MethodRow>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p>Metode pembayaran</p>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !canSplit}
          onClick={addRow}
        >
          <Plus /> <span>Tambah metode</span>
        </Button>
      </div>
      <ForEach items={rows}>
        {(row, index) => (
          <div className="grid grid-cols-[1fr_170px_40px] small:grid-cols-[1fr_130px_40px] items-center gap-2">
            <Select
              value={row.methodId}
              onValueChange={(methodId) => setRow(index, { methodId })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectGroup key={group.kind}>
                    {group.base === null ? null : (
                      <SelectItem value={group.base.id} showCheck>
                        {METHOD_NAMES[group.kind]}
                      </SelectItem>
                    )}
                    {group.variants.map((method) => (
                      <SelectItem key={method.id} value={method.id} showCheck>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={row.pay}
              onChange={(event) => setRow(index, { pay: event.currentTarget.value })}
              disabled={disabled || lockAmounts}
              aria-label="Jumlah pembayaran"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Hapus metode"
              disabled={disabled || !canSplit || rows.length === 1}
              onClick={() => removeRow(index)}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </ForEach>
      <div className="flex justify-between text-small text-muted-foreground">
        <span>Total pembayaran</span>
        <span className="tabular-nums">Rp{paid.toLocaleString("id-ID")}</span>
      </div>
    </div>
  );
}
