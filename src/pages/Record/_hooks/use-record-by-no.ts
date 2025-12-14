import { useAction } from "~/hooks-old/use-action";
import { z } from "zod";
import { useSearchParams } from "react-router";
import { Context } from "../page";

export function useRecordByNo({ db, toast }: Context) {
	const [_, setSearch] = useSearchParams();
	const { action, loading } = useAction("", (val: number) => db.record.get.byTimestamp(val));
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const value = z
			.string()
			.refine((v) => isNaN(Number(v)))
			.catch("")
			.parse(formData.get("no"));
		if (value === "") return;
		const [errMsg, r] = await action(Number(value));
		if (errMsg) {
			toast(errMsg);
			return;
		}
		if (r === null) {
			toast("Catatan tidak ada");
			return;
		}
		setSearch({
			mode: r.mode,
			time: value,
			selected: value,
		});
	};
	return { handleSubmit, loading };
}
