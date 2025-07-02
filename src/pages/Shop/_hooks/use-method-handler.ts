import { useMethod } from "./use-method";
import { z } from "zod";
import { defaultMethod, LocalContext } from "./use-local-state";

export function useMethodHandler(context: LocalContext) {
	const methods = context.state.methods;
	const [method, setMethod] = useMethod(context);
	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
	return { method, handleChange, suboption, suboptionTop, option };
}
