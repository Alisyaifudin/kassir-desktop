import { TableCell, TableRow } from "~/components/ui/table";

export function RawRow({
  item,
  i,
  clickRecord,
}: {
  i: number;
  clickRecord: (timestamp: number) => () => void;
  item: {
    name: string;
    id: number;
    price: number;
    capital: number;
    qty: number;
    timestamp: number;
    total: number;
    mode: DB.Mode;
  };
}) {
  return (
    <TableRow className={item.price <= item.capital ? "bg-red-300" : ""}>
      <TableCell className="font-medium">{i + 1}</TableCell>
      <TableCell></TableCell>
      <TableCell className="text-normal">
        <button className="cursor-pointer text-start" onClick={clickRecord(item.timestamp)}>
          {item.name}
        </button>
      </TableCell>
      <TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
      <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
      <TableCell className="text-end">{item.qty}</TableCell>
    </TableRow>
  );
}
