import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function useTime() {
  const [search, setSearch] = useSearchParams();
  const time = integer.catch(Date.now()).parse(search.get("time"));
  const set = (time: number) => {
    const s = new URLSearchParams(window.location.search);
    s.set("time", time.toString());
    setSearch(s);
  };
  return [time, set] as const;
}
