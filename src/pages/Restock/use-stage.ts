import { useSearchParams } from "react-router";
import { z } from "zod";
import { STAGES, type Stage } from "./Draft";

/**
 * Which stage the main panel is showing, kept in the URL so a refresh or a
 * shared link lands on the same step. `stage` is the one spelling of it.
 */
export function useStage() {
  const [search, setSearch] = useSearchParams();
  const stage = z.enum(STAGES).catch(STAGES[0]).parse(search.get("stage"));
  const setStage = (stage: Stage) => {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("stage", stage);
      return s;
    });
  };
  return [stage, setStage] as const;
}
