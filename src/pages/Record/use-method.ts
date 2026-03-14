import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { useSearchParams } from "react-router";
import { MethodFull } from "~/database/method/get-all";
import { DEFAULT_METHODS } from "~/lib/constants";
import { integer } from "~/lib/utils";

function getMethod(methods: MethodFull[], search: URLSearchParams) {
  const methodId = integer.nullable().catch(null).parse(search.get("method"));
  const method = methods.find((m) => m.id === methodId) ?? null;
  return method;
}

const methodsAtom = createAtom<MethodFull[]>(DEFAULT_METHODS);

export const setMethods = methodsAtom.set;
export function useMethods() {
  return useAtom(methodsAtom);
}

export function useMethod() {
  const [search, setSearch] = useSearchParams();
  const methods = useAtom(methodsAtom);
  const method = getMethod(methods, search);
  function setMethod(id: number | null) {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      if (id === null) {
        search.delete("method");
      } else {
        const selected = method?.id;
        if (selected === id) {
          search.delete("method");
        } else {
          search.set("method", id.toString());
        }
      }
      return search;
    });
  }
  return [method, setMethod] as const;
}
