import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useKind() {
  const [search] = useSearchParams();
  const kind = useMemo(() => {
    const kind = z.enum(["saving", "debt", "diff"]).catch("saving").parse(search.get("kind"));
    return kind;
  }, [search]);
  return kind;
}
