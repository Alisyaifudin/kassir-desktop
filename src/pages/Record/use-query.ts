import { useSearchParams } from "react-router";

function getQuery(search: URLSearchParams): string {
  const query = search.get("query");
  if (query === null) {
    return "";
  }
  return query;
}

export function setQuery(search: URLSearchParams, query: string) {
  search.set("query", query);
}

export function useQuery() {
  const [search] = useSearchParams();
  return getQuery(search);
}
