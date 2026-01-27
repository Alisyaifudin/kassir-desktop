import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMethod() {
  const [search, setSearch] = useSearchParams();
  const method = useMemo(() => {
    const method = z
      .enum(["transfer", "debit", "qris"])
      .catch("transfer")
      .parse(search.get("method"));
    return method;
  }, [search]);
  const setMethod = (method: "transfer" | "debit" | "qris") => setSearch({ method });
  return [method, setMethod] as const;
}
