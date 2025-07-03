import { memo } from "react";
import { Show } from "~/components/Show";
import { Input } from "~/components/ui/input";
import { useDebt } from "../../_hooks/use-debt";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";

export const Debt = memo(function ({
	credit,
	timestamp,
	grandTotal,
	role,
	revalidate
}: {
	role: DB.Role;
	credit: number;
	timestamp: number;
	grandTotal: number;
	revalidate: () => void,
}) {
	const { error, handleSubmit, loading } = useDebt(timestamp, revalidate, grandTotal);
	return (
		<Show when={credit == 1 && role === "admin"}>
			<form onSubmit={handleSubmit}>
				<label className="flex items-center gap-5">
					<span className="text-red-500">Kredit</span>
					<Input placeholder="Bayaran..." type="number" name="pay" className="w-[200px]" aria-autocomplete="list" />
					<Input placeholder="Pembulatan" type="number" name="round" className="w-[200px]" aria-autocomplete="list" />
					<Button>
						Bayar <Spinner when={loading} />
					</Button>
					<TextError>{error}</TextError>
				</label>
			</form>
		</Show>
	);
});
