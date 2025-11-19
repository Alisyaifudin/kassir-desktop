import { useUser } from "~/hooks/use-user";
import { capitalize } from "~/lib/utils";

export function GrandTotal({ grandTotal, fix }: { grandTotal: number; fix: number }) {
	const user = useUser();
	return (
		<div className="flex flex-col gap-2 pb-5">
			<p className="text-3xl px-2 text-end">Kasir: {capitalize(user.name)}</p>
			<p className="text-9xl text-center">
				Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
			</p>
		</div>
	);
}
