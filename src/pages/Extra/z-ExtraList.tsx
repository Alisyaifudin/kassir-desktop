import { SquareArrowOutUpRight } from "lucide-react";
import { TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { Extra } from "~/database/extra/cache";
import { useFilterExtras } from "./use-filter-extras";
import { cn } from "~/lib/utils";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { useQuery } from "./use-query";
import { useMemo } from "react";

type Props = {
  all: Extra[];
};

export function ExtraList({ all }: Props) {
  const extras = useFilterExtras(all);
  const urlBack = useGenerateUrlBack("/extras");
  const [query] = useQuery();
  const filtered = useMemo(() => {
    if (query.trim() === "") return extras;
    const filtered = extras.filter((extra) =>
      extra.name.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered;
  }, [query, extras]);
  return (
    <TableBody>
      {filtered.map((extra, i) => (
        <TableRow key={i} className={cn({ "bg-blue-50/50": i % 2 == 0 })}>
          <TableCell>{i + 1}</TableCell>
          <TableCell>{extra.name}</TableCell>
          <TableCell className="text-right">{label[extra.kind]}</TableCell>
          <TableCell className="text-right">{extra.value.toLocaleString("id-ID")}</TableCell>
          <TableCell className="">
            <Button asChild variant="link" className="p-0 cursor-pointer">
              <Link
                to={{
                  pathname: extra.id,
                  search: `?url_back=${encodeURIComponent(urlBack)}`,
                }}
              >
                <SquareArrowOutUpRight className="icon" />
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

const label = {
  percent: "Persen",
  number: "Angka",
};
