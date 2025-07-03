import { Spinner } from "~/components/Spinner";
import { useRecordByNo } from "../_hooks/use-record-by-no";
import { Input } from "~/components/ui/input";
import { Search } from "./Search";
import { Context } from "../Records";

export function FormNo({ context }: { context: Context }) {
	const { loading, handleSubmit } = useRecordByNo(context);
	return (
		<div className="flex gap-2 flex-1 pl-4">
			<Search />
			<form onSubmit={handleSubmit} className="flex gap-2 items-center">
				<Spinner when={loading} />
				<p>No:</p>
				<Input type="search" placeholder="Cari catatan" name="no" aria-autocomplete="list"/>
			</form>
		</div>
	);
}
