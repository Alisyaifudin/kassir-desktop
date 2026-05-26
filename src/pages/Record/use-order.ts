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

export function useOrder() {
  const [search, setSearch] = useSearchParams();
  const order = getOrder(search);
  function setOrder(order: "total" | "time", sort: "asc" | "desc") {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      search.set("order", order);
      search.set("sort", sort);
      return search;
    });
  }
  return [order, setOrder] as const;
}
