import { useParams } from "../_hooks/use-params";
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

export function PanelAdditional({ length }: { length: number }) {
	const { set, get } = useParams();
	const { totalPage } = useInterval(length);
	const user = useUser();
	const size = useSize();
	return (
		<div className="flex items-center gap-10">
			<Search query={get.query} setQuery={set.query} />
			<div className="flex items-center gap-2">
				<Pagination
					pagination={{ page: get.pageAdditional, total: totalPage }}
					setPage={set.pageAdditional}
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
						to="/stock/additional/new"
						className="self-end flex gap-5 items-center text-3xl w-fit"
					>
						Tambah Biaya Lainnya
						<Button className="rounded-full p-2">
							<Plus size={style[size].icon} />
						</Button>
					</Link>
				</Show>
			</div>
		</div>
	);
}
