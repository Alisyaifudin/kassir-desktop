import { Button } from "~/components/ui/button";
import { METHOD_NAMES } from "~/lib/utils";

export function FilterBtn({
	selected,
	onClick,
	options,
	top,
}: {
	onClick: (id: number) => void;
	selected: number | null;
	top: DB.Method;
	options: DB.Method[];
}) {
	return (
		<div className="flex flex-col gap-2">
			<Button
				variant={top.id === selected ? "default" : "outline"}
				className="w-fit p-1 px-3 font-bold text-3xl"
				onClick={() => onClick(top.id)}
			>
				{METHOD_NAMES[top.method]}
			</Button>
			<div className="flex items-center gap-3 flex-wrap">
				{options.map((m) => (
					<div key={m.id} className="flex gap-2 items-center pl-3">
						<Button
							variant={m.id === selected ? "default" : "outline"}
							className=" w-fit p-1"
							onClick={() => onClick(m.id)}
						>
							{m.name}
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
