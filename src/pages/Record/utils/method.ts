import { SetURLSearchParams } from "react-router";
import { Method } from "~/database/method/get-all";
import { integer } from "~/lib/utils";

export function getMethodId(search: URLSearchParams): number | null {
  const methodId = integer.nullable().catch(null).parse(search.get("method"));
  return methodId;
}

export function getMethod(methods: Method[], search: URLSearchParams) {
  const methodId = integer.nullable().catch(null).parse(search.get("method"));
  const method = methods.find((m) => m.id === methodId) ?? null;
  return method;
}

export function setMethod(setSearch: SetURLSearchParams, methodId: number | null) {
  const search = new URLSearchParams(window.location.search);
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
  setSearch(search);
}
