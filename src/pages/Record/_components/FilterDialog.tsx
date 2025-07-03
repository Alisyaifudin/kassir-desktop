import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { ForEach } from "~/components/ForEach";
import { FilterBtn } from "./FilterBtn";
import { getParam, setParam } from "../_utils/params";
import { useSearchParams } from "react-router";
import { METHOD_NAMES } from "~/lib/utils";
import { Show } from "~/components/Show";

export function Filter({ methods }: { methods: DB.Method[] }) {
	const [search, setSearch] = useSearchParams();
	const method = getParam(search).method(methods);
	const setMethod = setParam(setSearch).method;
	const handleClick = (id: number) => {
		setMethod(id);
	};
	const handleClear = () => {
		setMethod(null);
	};
	const group = groupMethods(methods);
	return (
		<Dialog>
			<Button asChild variant="outline">
				<DialogTrigger>
					<SlidersHorizontal />
					<Show value={method} fallback={<p>Filter</p>}>
						{(v) => (
							<p>
								{METHOD_NAMES[v.method]} {v.name}
							</p>
						)}
					</Show>
				</DialogTrigger>
			</Button>
			{method === null ? null : (
				<Button size="icon" variant="ghost" onClick={handleClear}>
					<X />
				</Button>
			)}
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Filter Metode Pembayaran</DialogTitle>
					<div className="flex flex-col gap-5">
						<ForEach items={group}>
							{({ top, options }) => (
								<FilterBtn
									key={top.id}
									selected={method?.id ?? null}
									onClick={handleClick}
									options={options}
									top={top}
								/>
							)}
						</ForEach>
					</div>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}

function groupMethods(methods: DB.Method[]): { top: DB.Method; options: DB.Method[] }[] {
	return [
		filterMethod("cash", methods),
		filterMethod("transfer", methods),
		filterMethod("debit", methods),
		filterMethod("qris", methods),
	];
}
function filterMethod(name: DB.MethodEnum, methods: DB.Method[]) {
	const top = methods.find((m) => m.method === name && m.name === null);
	if (top === undefined) throw new Error("No " + name);
	const options = methods.filter((m) => m.method === name && m.name !== null);
	return { top, options };
}
