import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Show } from "~/components/Show";
import { formatEpochtime, getDayName } from "~/lib/date";
import { Money } from "~/services/money/type";
import { DeleteRecord } from "./z-DeleteRecord";
import type { PocketBase } from "~/services/pocket/type";

type Props = {
  useMoney: (start: number, end: number) => Money[];
  usePocket: () => PocketBase;
  onDeleteRecord: (id: string) => Promise<string | null>;
  start: number;
  end: number;
};

export function TableList({ useMoney, usePocket, onDeleteRecord, start, end }: Props) {
  const money = useMoney(start, end);
  const pocket = usePocket();
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[55px] small:w-[40px]">No</TableHead>
          <TableHead className="text-center w-[120px] small:w-[70px]">Hari</TableHead>
          <TableHead className="text-center w-[290px] small:w-[200px]">Tanggal</TableHead>
          <TableHead className="text-center w-[140px] small:w-[100px]">Waktu</TableHead>
          <Show when={pocket.type === "change"}>
            <TableHead className="text-right w-[200px] small:w-[150px]">Selisih</TableHead>
          </Show>
          <TableHead className="text-right w-[200px] small:w-[150px]">Nilai</TableHead>
          <TableHead className="text-center">Catatan</TableHead>
          <TableHead className="text-right w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {money.map((m, i) => (
          <TableRow key={m.timestamp}>
            <TableCell className="font-medium">{i + 1}</TableCell>
            <TableCell className="text-center">{getDayName(m.timestamp)}</TableCell>
            <TableCell className="text-center">
              {formatEpochtime(m.timestamp, { date: "long" })}
            </TableCell>
            <TableCell className="text-center">
              {formatEpochtime(m.timestamp, { time: "long" })}
            </TableCell>
            <Show when={pocket.type === "change"}>
              <TableCell className="text-right">Rp{m.diff.toLocaleString("id-ID")}</TableCell>
            </Show>
            <TableCell className="text-right">Rp{m.value.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-center">{m.note}</TableCell>
            <TableCell>
              <Show when={i === 0}>
                <DeleteRecord money={m} onDelete={onDeleteRecord} />
              </Show>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
