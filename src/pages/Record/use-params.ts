import { useSearchParams } from "react-router";
import { getMethod, getMethodId, setMethod } from "./utils/method";
import { getMode, setMode } from "./utils/mode";
import { getQuery, setQuery } from "./utils/query";
import { getSelected, setSelected, setUnselect } from "./utils/selected";
import { getTime, setTime } from "./utils/time";
import { Method } from "~/database/method/get-all";
import { useMemo } from "react";
import { getOrder, setOrder } from "./utils/order";

export function useParams() {
  const [search] = useSearchParams();
  const params = getParam(search);
  return params;
}

export function useSetParams() {
  const [, setSearch] = useSearchParams();
  const set = useMemo(
    () => ({
      mode: (mode: DB.Mode) => setMode(setSearch, mode),
      method: (methodId: number | null) => setMethod(setSearch, methodId),
      query: (query: string) => setQuery(setSearch, query),
      selected: (clicked: number, selected: null | number) =>
        setSelected(setSearch, clicked, selected),
      unselect: () => setUnselect(setSearch),
      time: (timestamp: number) => setTime(setSearch, timestamp),
      order: (order: "time" | "total", sort: "asc" | "desc") => setOrder(setSearch, order, sort),
    }),
    []
  );
  return set;
}

function getParam(search: URLSearchParams) {
  return {
    mode: getMode(search),
    order: getOrder(search),
    method: (methods: Method[]) => getMethod(methods, search),
    methodId: getMethodId(search),
    query: getQuery(search),
    selected: getSelected(search),
    time: getTime(search),
  };
}

// function setParam(setSearch: SetURLSearchParams) {
//   return {
//     mode: (mode: DB.Mode) => setMode(setSearch, mode),
//     method: (methodId: number | null) => setMethod(setSearch, methodId),
//     query: (query: string) => setQuery(setSearch, query),
//     selected: (clicked: number) => setSelected(setSearch, clicked, selected),
//     time: (timestamp: number) => setTime(setSearch, timestamp),
//   };
// }
