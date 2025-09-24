import type { Additional } from "../../_utils/util-schema";
import { Context, useCtx } from "../use-context";
import { produce } from "immer";

export function useAdditional() {
	const context = useCtx();
	const additionals = context.state.additionals;
	const setAdditionals = {
		add: add(context),
		del: del(context),
		name: setName(context),
		kind: setKind(context),
		value: setValue(context),
		saved: setSaved(context),
	};
	return [additionals, setAdditionals] as const;
}

function add(context: Context) {
	return (additional: Additional) => {
		const state = produce(context.state, (state) => {
			state.additionals.push(additional);
		});
		context.setState(state);
	};
}

function del(context: Context) {
	return (index: number) => {
		const state = produce(context.state, (state) => {
			state.additionals = state.additionals.filter((_, i) => i !== index);
		});
		context.setState(state);
	};
}

function setName(context: Context) {
	return (index: number, name: string) => {
		const state = produce(context.state, (state) => {
			state.additionals[index].name = name;
		});
		context.setState(state);
	};
}

function setKind(context: Context) {
	return (index: number, kind: DB.ValueKind) => {
		const state = produce(context.state, (state) => {
			state.additionals[index].kind = kind;
			if (kind === "percent" && state.additionals[index].value > 100) {
				state.additionals[index].value = 100;
			}
		});
		context.setState(state);
	};
}

function setValue(context: Context) {
	return (index: number, value: number) => {
		const state = produce(context.state, (state) => {
			let val = value;
			if (state.additionals[index].kind === "percent" && val > 100) {
				val = 100;
			}
			state.additionals[index].value = val;
		});
		context.setState(state);
	};
}
function setSaved(context: Context) {
	return (index: number, check: boolean) => {
		const state = produce(context.state, (state) => {
			state.additionals[index].saved = check;
		});
		context.setState(state);
	};
}
