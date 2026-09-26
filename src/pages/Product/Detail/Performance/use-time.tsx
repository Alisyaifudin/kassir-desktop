import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function useTime() {
  const [search, setSearch] = useSearchParams();
  const timestamp = integer.catch(Date.now()).parse(search.get("time"));
  function setTime(timestamp: number) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("time", timestamp.toString());
      return s;
    });
  }
  return [timestamp, setTime] as const;
}
