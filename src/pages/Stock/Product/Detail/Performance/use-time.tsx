import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function useTime() {
  const [search, setSearch] = useSearchParams();
  const timestamp = integer.catch(Date.now()).parse(search.get("time"));
  function setTime(timestamp: number) {
    const s = new URLSearchParams(window.location.search);
    s.set("time", timestamp.toString());
    setSearch(s);
  }
  return [timestamp, setTime] as const;
}
