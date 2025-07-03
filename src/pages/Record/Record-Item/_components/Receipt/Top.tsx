import { Button } from "~/components/ui/button";

const title = {
	buy: "Beli",
	sell: "Jual",
};

export function Top({
	mode,
	ref,
	print,
	credit,
}: {
	mode: DB.Mode;
	credit: 0 | 1;
	ref: React.RefObject<HTMLButtonElement>;
	print: () => void;
}) {
	return (
		<div className="flex justify-between items-center">
			<div className="flex items-center gap-2">
				<h2 className="font-bold  px-2 rounded-md text-3xl">{title[mode]}</h2>
				{mode === "buy" ? (
					credit === 0 ? (
						<p className="text-2xl text-emerald-500">: Lunas</p>
					) : (
						<p className="text-2xl text-red-500">: Kredit</p>
					)
				) : null}
			</div>
			<Button ref={ref} onClick={print}>
				Cetak
			</Button>
		</div>
	);
}
