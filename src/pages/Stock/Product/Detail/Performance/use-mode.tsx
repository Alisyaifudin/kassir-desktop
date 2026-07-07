import { useSearchParams } from "react-router";
import { z } from "zod";

const modeSchema = z.enum(["positive", "negative"]);
export type DeltaFilter = z.infer<typeof modeSchema>;

export function useDeltaFilter() {
  const [search, setSearch] = useSearchParams();
  const delta = modeSchema.catch("positive").parse(search.get("delta"));
  function setDelta(delta: DeltaFilter) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("delta", delta);
      return s;
    });
  }
  return [delta, setDelta] as const;
}
