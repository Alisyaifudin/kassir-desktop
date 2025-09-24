import { useMethod } from "~/pages/Shop/use-method";
import { z } from "zod";
import { defaultMethod } from "~/pages/Shop/use-local-state";
import { useCtx } from "~/pages/Shop/use-context";

export function useMethodHandler() {
	const { methods } = useCtx();
	const [method, setMethod] = useMethod();
	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const val = e.currentTarget.value;
		const methodKind = z.enum(["cash", "transfer", "debit", "qris"]).catch("cash").parse(val);
		const methodId = (
			methods.find((m) => m.method === methodKind && m.name === null) ?? defaultMethod
		).id;
		setMethod(methodId);
	};
	const handleChangeSub = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const val = e.currentTarget.value;
		const methodId = z.coerce.number().int().catch(1000).parse(val);
		const selected = methods.find((m) => m.id === methodId) ?? defaultMethod;
		setMethod(selected.id);
	};
	const suboption = methods.filter((m) => m.method === method.method && m.name !== null);
	const option = methods.filter((m) => m.name === null);
	const suboptionTop = option.find((o) => o.method === method.method);
	if (suboptionTop === undefined) {
		throw new Error("No suboption top???");
	}
	return { method, handleChange, handleChangeSub, suboption, suboptionTop, option };
}
