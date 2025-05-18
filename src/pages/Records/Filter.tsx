import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Method, METHOD_NAMES, METHODS } from "~/lib/utils";
import { SlidersHorizontal } from "lucide-react";

export function Filter({
	method,
	setMethod,
	methods,
}: {
	methods: DB.MethodType[];
	method: {
		method: Method;
		type: number | null;
	} | null;
	setMethod: React.Dispatch<
		React.SetStateAction<{
			method: Method;
			type: number | null;
		} | null>
	>;
}) {
	const handleClickSingle = (m: Method) => () => {
		if (method?.method === m && method.type === null) {
			setMethod(null);
			return;
		}
		setMethod({
			method: m,
			type: null,
		});
	};
	const handleClickMultiple = (m: Method, id: number) => () => {
		if (method?.method === m && method.type === id) {
			setMethod(null);
			return;
		}
		setMethod({
			method: m,
			type: id,
		});
	};
	return (
		<Dialog>
			<Button asChild variant="outline">
				<DialogTrigger>
					<SlidersHorizontal />
				</DialogTrigger>
			</Button>
			<DialogContent className="text-3xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Filter Metode Pembayaran</DialogTitle>
					<div className="flex flex-col gap-5">
						{METHODS.map((n) => {
							const methodTypes = methods.filter((m) => m.method === n);
							return (
								<div key={n} className="flex flex-col gap-2">
									<Button
										variant={method?.method === n && method.type === null ? "default" : "outline"}
										className="w-fit p-1 px-3 font-bold text-3xl"
										onClick={handleClickSingle(n)}
									>
										{METHOD_NAMES[n]}
									</Button>
									<div className="flex items-center gap-3">
										{methodTypes.map((m) => (
											<div key={m.id} className="flex gap-2 items-center pl-3">
												<Button
													variant={
														method?.method === n && method.type === m.id ? "default" : "outline"
													}
													className=" w-fit p-1"
													onClick={handleClickMultiple(n, m.id)}
												>
													{m.name}
												</Button>
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
