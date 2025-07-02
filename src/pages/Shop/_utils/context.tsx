import { createContext } from "react";
import type { State } from "./schema";
import { SetState } from "../_hooks/use-local-state";
import { Summary } from "./generate-record";

export const Context = createContext<null | {
	state: State;
	setState: SetState;
	summary: Summary;
}>(null);

export const Provider = Context.Provider;
