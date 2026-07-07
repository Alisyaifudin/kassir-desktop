import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PaginationContent, PaginationItem, Pagination as Root } from "~/components/ui/pagination";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { usePage } from "./use-page";

type Props = {
  total: number;
};

export function Pagination({ total }: Props) {
  const [page, setPage] = usePage();
  if (page === null) {
    return <Loader2 className="animate-spin" />;
  }
  const handlePrev = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  const handleNext = () => {
    if (total - page > 0) {
      setPage(page + 1);
    }
  };
  return (
    <Root className="w-fit pt-3">
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            onClick={handlePrev}
            className={cn({ "text-muted-foreground/40": page === 1 })}
            disabled={page === 1}
          >
            <ChevronLeft />
          </Button>
        </PaginationItem>
        <PaginationItem className="relative">
          <span className="absolute small:left-[-35px] left-[-40px] -top-6 text-small z-50 px-1">
            Halaman
          </span>
          <p>{page}</p>
        </PaginationItem>
        <PaginationItem>
          <Button
            variant="ghost"
            onClick={handleNext}
            disabled={total - page <= 0}
            className={cn({ "text-muted-foreground/40": total - page <= 0 })}
          >
            <ChevronRight />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Root>
  );
}
