import { createAtom } from "@xstate/store";

export const customerStore = createAtom<{ name: string; phone: string; id?: number }>({
  name: "",
  phone: "",
  id: undefined,
});