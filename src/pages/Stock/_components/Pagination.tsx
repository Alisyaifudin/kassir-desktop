import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PaginationContent, PaginationItem, Pagination as Root } from "~/components/ui/pagination";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

type Props = {
	pagination: { page: number; total: number } | { page: null; total: null };
	setPage: (page: number) => void;
};

export function Pagination({ pagination, setPage }: Props) {
	const { page, total } = pagination;
	const size = useSize();
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
		<Root className="w-fit">
			<PaginationContent>
				<PaginationItem>
					<Button
						variant="link"
						onClick={handlePrev}
						className={cn({ "text-muted-foreground/40": page === 1 })}
						disabled={page === 1}
					>
						<ChevronLeft size={style[size].icon} />
					</Button>
				</PaginationItem>
				<PaginationItem className="relative">
					<span className="absolute -top-6 text-lg -left-8 z-10 px-1 bg-white">Halaman</span>
					<p style={style[size].text}>{page}</p>
				</PaginationItem>
				<PaginationItem>
					<Button
						variant="link"
						onClick={handleNext}
						disabled={total - page <= 0}
						className={cn({ "text-muted-foreground/40": total - page <= 0 })}
					>
						<ChevronRight size={style[size].icon} />
					</Button>
				</PaginationItem>
			</PaginationContent>
		</Root>
	);
}
