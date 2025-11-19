import { useParams } from "../_hooks/use-params";
import { Sort } from "./Sort";
import { Search } from "./Search";
import { Pagination } from "./Pagination";
import { useUser } from "~/hooks/use-user";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "../_hooks/use-interval";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function PanelProduct({ productsLength }: { productsLength: number }) {
	const { set, get } = useParams();
	const { totalPage } = useInterval(productsLength);
	const user = useUser();
	const size = useSize();
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-10">
				<Sort
					sortDir={get.sortDir}
					setSortDir={set.sortDir}
					sortBy={get.sortBy}
					setSortBy={set.sortBy}
				/>
				<div className="flex items-center gap-2">
					<Pagination
						pagination={{ page: get.pageProduct, total: totalPage }}
						setPage={set.pageProduct}
					/>
					<div className="relative">
						<span className="absolute -top-5 left-1 text-lg z-10 px-1 bg-white">limit</span>
						<select
							style={style[size].text}
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
						<Link
							style={style[size].text}
							to="/stock/product/new"
							className="self-end flex gap-5 items-center text-3xl w-fit"
						>
							Tambah Produk
							<Button style={style[size].text} className="rounded-full p-2">
								<Plus size={style[size].icon} />
							</Button>
						</Link>
					</Show>
				</div>
			</div>
			<Search className="xl:hidden" query={get.query} setQuery={set.query} />
		</div>
	);
}
