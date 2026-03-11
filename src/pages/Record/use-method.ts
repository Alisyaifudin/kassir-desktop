import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { useSearchParams } from "react-router";
import { Method } from "~/database/method/get-all";
import { integer } from "~/lib/utils";

// function getMethodId(search: URLSearchParams): number | null {
//   const methodId = integer.nullable().catch(null).parse(search.get("method"));
//   return methodId;
// }

function getMethod(methods: Method[], search: URLSearchParams) {
  const methodId = integer.nullable().catch(null).parse(search.get("method"));
  const method = methods.find((m) => m.id === methodId) ?? null;
  return method;
}

export function setMethod(search: URLSearchParams, methodId: number | null) {
  if (methodId === null) {
    search.delete("method");
  } else {
    const selected = integer.nullable().catch(null).parse(search.get("method"));
    if (selected === methodId) {
      search.delete("method");
    } else {
      search.set("method", methodId.toString());
    }
  }
}

const methodsAtom = createAtom<Method[]>([]);

export function useMethod() {
  const [search] = useSearchParams();
  const methods = useAtom(methodsAtom);
  return getMethod(methods, search);
}

// export function useMethodId() {
//   const [search]= useSearchParams();
//   const methods = useAtom(methodsAtom);
//   return getMethod(methods, search);
// }
