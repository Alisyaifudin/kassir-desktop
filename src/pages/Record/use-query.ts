import { useSearchParams } from "react-router";

function getQuery(search: URLSearchParams): string {
  const query = search.get("query");
  if (query === null) {
    return "";
  }
  return query;
}


/**
 * The search box's text, kept in the URL so a refresh keeps the filter.
 *
 * The write **replaces** the history entry: the box is debounced, so pushing
 * would add one history entry per typing pause and Back would rewind the query
 * letter by letter instead of leaving the screen.
 */
export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = getQuery(search);
  function setQuery(query: string) {
    setSearch(
      (old) => {
        const search = new URLSearchParams(old);
        if (query.trim() === "") {
          search.delete("query");
        } else {
          search.set("query", query);
        }
        return search;
      },
      { replace: true },
    );
  }
  return [query, setQuery] as const;
}
