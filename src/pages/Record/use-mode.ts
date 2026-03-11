import { useSearchParams } from "react-router";
import { z } from "zod";

function getMode(search: URLSearchParams) {
  const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
  const mode = parsed.success ? parsed.data : "sell";
  return mode;
}

export function setMode(search: URLSearchParams, mode: "sell" | "buy") {
  search.set("mode", mode);
  search.delete("selected");
}

export function useMode() {
  const [search] = useSearchParams();
  return getMode(search);
}
