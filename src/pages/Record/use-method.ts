import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { useSearchParams } from "react-router";
import { z } from "zod";
import type { Method} from "~/database/method/cache";
import { DEFAULT_METHODS } from "~/lib/constants";

function getMethod(methods: Method[], search: URLSearchParams) {
  const methodId = z.string().nullable().catch(null).parse(search.get("method"));
  const method = methods.find((m) => m.id === methodId) ?? null;
  return method;
}

const methodsAtom = createAtom<Method[]>(DEFAULT_METHODS);

export const setMethods = methodsAtom.set;
export function useMethods() {
  return useAtom(methodsAtom);
}

export function useMethod() {
  const [search, setSearch] = useSearchParams();
  const methods = useAtom(methodsAtom);
  const method = getMethod(methods, search);
  function setMethod(id: string | null) {
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
