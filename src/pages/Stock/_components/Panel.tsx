import { useParams } from "../_hooks/use-params";
import { SortDir } from "./Sort";
import { Search } from "./Search";
import { Pagination } from "./Pagination";
import { useUser } from "~/hooks/use-user";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "../_hooks/use-interval";

export function Panel({ productsLength }: { productsLength: number }) {
	const { set, get } = useParams();
	const { totalPage } = useInterval(productsLength);
	const user = useUser();
	return (
		<div className="flex items-center gap-10">
			<SortDir
				sortDir={get.sortDir}
				setSortDir={set.sortDir}
				sortBy={get.sortBy}
				setSortBy={set.sortBy}
			/>
			<Search query={get.query} setQuery={set.query} />
			<div className="flex items-center gap-2">
				<Pagination pagination={{ page: get.page, total: totalPage }} setPage={set.page} />
				<div className="relative">
					<span className="absolute -top-5 left-1 text-lg z-10 px-1 bg-white">limit</span>
					<select
						value={get.limit}
						className="w-fit text-3xl"
						onChange={(e) => set.limit(e.currentTarget.value)}
					>
						<option value={10}>10</option>
						<option value={20}>20</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>
				<Show when={user.role === "admin"}>
					<Link to="/stock/new" className="self-end flex gap-5 items-center text-3xl w-fit">
						Tambah Produk
						<Button className="rounded-full h-13 w-13">
							<Plus size={35} />
						</Button>
					</Link>
				</Show>
			</div>
		</div>
	);
}
