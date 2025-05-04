import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
	PaginationContent,
	PaginationItem,
	Pagination as Root,
} from "../../components/ui/pagination";
import { SetURLSearchParams } from "react-router";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export function Pagination({
	page,
	total,
	setSearch,
}: ({ page: number; total: number } | { page: null; total: null }) & {
	setSearch: SetURLSearchParams;
}) {
	if (page === null) {
		return <Loader2 className="animate-spin" />;
	}
	const handlePrev = () => {
		if (page > 1) {
			goto(page - 1, setSearch);
		}
	};
	const handleNext = () => {
		if (total - page > 0) {
			goto(page + 1, setSearch);
		}
	};
	return (
		<Root>
			<PaginationContent>
				<PaginationItem>
					<Button
						variant="link"
						onClick={handlePrev}
						className={cn({ "text-muted-foreground/40": page === 1 })}
						disabled={page === 1}
					>
						<ChevronLeft size={30} />
					</Button>
				</PaginationItem>
				<PaginationItem className="relative">
					<span className="absolute -top-6 text-lg -left-8 z-10 px-1 bg-white">Halaman</span>
					<p className="text-3xl">{page}</p>
				</PaginationItem>
				<PaginationItem>
					<Button
						variant="link"
						onClick={handleNext}
						disabled={total - page <= 0}
						className={cn({ "text-muted-foreground/40": total - page <= 0 })}
					>
						<ChevronRight size={30} />
					</Button>
				</PaginationItem>
			</PaginationContent>
		</Root>
	);
}

function goto(page: number, setSearch: SetURLSearchParams) {
	setSearch((prev) => {
		const params = new URLSearchParams(prev);
		params.set("page", page.toString());
		return params;
	});
}
