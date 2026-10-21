import { useSearchParams } from "react-router";
import { z } from "zod";

function getOrder(search: URLSearchParams): {
  order: "total" | "time";
  sort: "asc" | "desc";
} {
  const parsed = z
    .object({
      order: z.enum(["total", "time"]),
      sort: z.enum(["asc", "desc"]),
    })
    .safeParse({
      order: search.get("order"),
      sort: search.get("sort"),
    });
  if (!parsed.success) {
    return { order: "time", sort: "desc" };
  }
  return parsed.data;
}

/**
 * The sort column and direction, kept in the URL.
 *
 * The write **replaces** the history entry: clicking a column header must not
 * push a history entry, or Back would undo the sort before leaving the screen.
 */
export function useOrder() {
  const [search, setSearch] = useSearchParams();
  const order = getOrder(search);
  function setOrder(order: "total" | "time", sort: "asc" | "desc") {
    setSearch(
      (old) => {
        const search = new URLSearchParams(old);
        search.set("order", order);
        search.set("sort", sort);
        return search;
      },
      { replace: true },
    );
  }
  return [order, setOrder] as const;
}
