import type { Additional } from "../_utils/schema";
import type { LocalContext } from "./use-local-state";
import { produce } from "immer";

export function useAdditional(context: LocalContext) {
	const additionals = context.state.additionals;
	const setAdditionals = {
		add: add(context),
		del: del(context),
		name: setName(context),
		kind: setKind(context),
		value: setValue(context),
	};
	return [additionals, setAdditionals] as const;
}

function add(context: LocalContext) {
	return (additional: Additional) => {
		const state = produce(context.state, (state) => {
			state.additionals.push(additional);
		});
		context.setState(state);
	};
}

function del(context: LocalContext) {
	return (index: number) => {
		const state = produce(context.state, (state) => {
			state.additionals = state.additionals.filter((_, i) => i !== index);
		});
		context.setState(state);
	};
}

function setName(context: LocalContext) {
	return (index: number, name: string) => {
		const state = produce(context.state, (state) => {
			state.additionals[index].name = name;
		});
		context.setState(state);
	};
}

function setKind(context: LocalContext) {
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

function setValue(context: LocalContext) {
	return (index: number, value: number) => {
		const state = produce(context.state, (state) => {
			let val = value;
			if (state.additionals[index].kind === "percent" && val > 100) {
				val = 100;
			}
			if (val < 0) {
				val = 0;
			}
			state.additionals[index].value = val;
		});
		context.setState(state);
	};
}
