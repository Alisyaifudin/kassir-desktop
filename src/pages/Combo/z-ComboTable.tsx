import { Link } from "~/services/route/react";
import { SquareArrowOutUpRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { Combo } from "~/services/combo";
import { ComboStatus, comboUpdatedAt } from "./z-ComboBits";

export function ComboTable({ items, start }: { items: Combo[]; start: number }) {
  return (
    <Table className="text-base">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-right">Listing</TableHead>
          <TableHead className="text-right max-sm:hidden">Biaya/potongan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="max-md:hidden">Diubah</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((combo, index) => (
          <TableRow key={combo.id} className={!combo.active ? "bg-muted/50" : undefined}>
            <TableCell className="tabular-nums text-muted-foreground">{start + index + 1}</TableCell>
            <TableCell>
              <span className={cn("font-medium", !combo.active && "text-muted-foreground")}>{combo.name}</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{combo.components.length}</TableCell>
            <TableCell className="text-right tabular-nums max-sm:hidden">{combo.extras.length}</TableCell>
            <TableCell><ComboStatus active={combo.active} /></TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground max-md:hidden">
              {comboUpdatedAt(combo.updatedAt)}
            </TableCell>
            <TableCell>
              <Button asChild variant="ghost" className="size-11">
                <Link to={`/combos/${combo.id}`} behavior="push" aria-label={`Ubah ${combo.name}`}>
                  <SquareArrowOutUpRight className="size-5" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
