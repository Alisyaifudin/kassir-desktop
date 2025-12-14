import { memo, useEffect, useState } from "react";
import { ForEach } from "~/components/ForEach";
import { log, METHOD_BASE_ID, METHOD_NAMES } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { Show } from "~/components/Show";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { useSubmit } from "react-router";

export const SelectMethod = memo(function ({
	method,
	methods,
	close,
}: {
	method: DB.Method;
	methods: DB.Method[];
	close: () => void;
}) {
	const option = methods.filter((m) => m.name === null);
	const suboption = methods.filter((m) => m.method === method.method && m.name !== null);
	const top = methods.find((m) => m.method === method.method && m.name === null);
	const [mount, setMount] = useState(false);
	const loading = useLoading();
	const error = useAction<Action>()("change-method");
	const submit = useSubmit();
	useEffect(() => {
		if (mount && error !== undefined && error.close && !loading) {
			close();
		}
		setMount(true);
	}, [error, loading]);
	if (top === undefined) {
		log.error("No top found?");
		return null;
	}
	function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const methodId = e.currentTarget.value;
		const formdata = new FormData();
		formdata.set("action", "change-method");
		formdata.set("method-id", methodId);
		submit(formdata, { method: "POST" });
	}
	return (
		<label className="grid grid-cols-[120px_1fr] items-center gap-2">
			<div className="flex items-center gap-1">
				<p>Metode</p>
			</div>
			<div className="flex items-center gap-2">
				<span>:</span>
				<select
					value={METHOD_BASE_ID[method.method]}
					className="w-fit outline"
					onChange={handleChange}
				>
					<ForEach items={option}>
						{(m) => <option value={m.id}>{METHOD_NAMES[m.method]}</option>}
					</ForEach>
				</select>
				<Show when={suboption.length > 0}>
					<select value={method.id} className=" w-fit outline" onChange={handleChange}>
						<option value={top.id}>--Pilih--</option>
						<ForEach items={suboption}>{(m) => <option value={m.id}>{m.name}</option>}</ForEach>
					</select>
				</Show>
			</div>
			<TextError className="col-span-2">{error?.message}</TextError>
		</label>
	);
});
