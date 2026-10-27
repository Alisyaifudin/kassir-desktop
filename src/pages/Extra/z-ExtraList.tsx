import { SquareArrowOutUpRight } from "lucide-react";
import { TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import type { Extra } from "~/services/extra";
import { useFilterExtras } from "./use-filter-extras";
import { cn } from "~/lib/utils";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { KIND_LABEL } from "./util-extra-options";

export function ExtraList({ all }: { all: Extra[] }) {
  const extras = useFilterExtras(all);
  const urlBack = useGenerateUrlBack("/extras");
  return (
    <TableBody>
      {extras.map((extra, i) => (
        <TableRow key={extra.id} className={cn({ "bg-blue-50/50": i % 2 == 0 })}>
          <TableCell>{i + 1}</TableCell>
          <TableCell>{extra.name}</TableCell>
          <TableCell className="text-right">{KIND_LABEL[extra.kind]}</TableCell>
          <TableCell className="text-right">{extra.value.toLocaleString("id-ID")}</TableCell>
          <TableCell className="">
            <Button asChild variant="link" className="p-0 cursor-pointer">
              <Link
                to={{
                  pathname: `/extras/${extra.id}`,
                  search: `?url_back=${encodeURIComponent(urlBack)}`,
                }}
              >
                <SquareArrowOutUpRight className="size-5" />
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
