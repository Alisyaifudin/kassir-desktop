import { useSearchParams } from "react-router";

function getQuery(search: URLSearchParams): string {
  const query = search.get("query");
  if (query === null) {
    return "";
  }
  return query;
}


export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = getQuery(search);
  function setQuery(query: string) {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      if (query.trim() === "") {
        search.delete("query");
      } else {
        search.set("query", query);
      }
      return search;
    });
  }
  return [query, setQuery] as const;
}
