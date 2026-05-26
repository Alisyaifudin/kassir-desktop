import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function useTime() {
  const [search, setSearch] = useSearchParams();
  const time = integer.catch(Date.now()).parse(search.get("time"));
  const set = (time: number) => {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("time", time.toString());
      s.set("limit", "100");
      return s;
    });
  };
  return [time, set] as const;
}
