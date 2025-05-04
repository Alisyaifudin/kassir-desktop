import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
	PaginationContent,
	PaginationItem,
	Pagination as Root,
} from "../../components/ui/pagination";
import { SetURLSearchParams } from "react-router";
import { Button } from "../../components/ui/button";

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
		<Root className="w-fit">
			<PaginationContent>
				{page > 1 ? (
					<PaginationItem>
						<Button variant="link" onClick={handlePrev}>
							<ChevronLeft size={30} />
						</Button>
					</PaginationItem>
				) : null}
				<PaginationItem>
					<p className="text-3xl">{page}</p>
				</PaginationItem>
				{total - page > 0 ? (
					<PaginationItem>
						<Button variant="link" onClick={handleNext}>
							<ChevronRight size={30} />
						</Button>
					</PaginationItem>
				) : null}
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
