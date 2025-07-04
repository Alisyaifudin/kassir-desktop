import { memo } from "react";
import { ForEach } from "~/components/ForEach";
import { Database } from "~/database";
import { log, METHOD_NAMES } from "~/lib/utils";
import { useSelectMethod } from "../../_hooks/use-select-method";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Show } from "~/components/Show";

export const SelectMethod = memo(function ({
	timestamp,
	method,
	methods,
	close,
	revalidate,
	context,
}: {
	timestamp: number;
	method: DB.Method;
	methods: DB.Method[];
	close: () => void;
	revalidate: () => void;
	context: { db: Database };
}) {
	const option = methods.filter((m) => m.name === null);
	const suboption = methods.filter((m) => m.method === method.method && m.name !== null);
	const top = methods.find((m) => m.method === method.method && m.name === null);
	const { loading, error, handleChange, handleChangeSub } = useSelectMethod(
		timestamp,
		methods,
		close,
		revalidate,
		context
	);
	if (top === undefined) {
		log.error("No top found?");
		return null;
	}
	return (
		<label className="grid grid-cols-[120px_1fr] items-center gap-2">
			<div className="flex items-center gap-1">
				<p>Metode:</p>
				<Spinner when={loading} />
			</div>
			<div className="flex items-center gap-2 text-3xl">
				<p>:</p>
				<select value={method.method} className=" w-fit outline" onChange={handleChange}>
					<ForEach items={option}>
						{(m) => <option value={m.method}>{METHOD_NAMES[m.method]}</option>}
					</ForEach>
				</select>
				<Show when={suboption.length > 0}>
					<select value={method.id} className=" w-fit outline" onChange={handleChangeSub}>
						<option value={top.id}>--Pilih--</option>
						<ForEach items={suboption}>{(m) => <option value={m.id}>{m.name}</option>}</ForEach>
					</select>
				</Show>
			</div>
			<TextError className="col-span-2">{error}</TextError>
		</label>
	);
});
