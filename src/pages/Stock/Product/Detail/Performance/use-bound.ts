import { useInterval } from "./use-interval";
import { useTime } from "./use-time";
import { getRange } from "./util-get-range";

export function useBound() {
  const [interval] = useInterval();
  const [time] = useTime();
  let [start, end] = getRange(time, interval);
  return [start, end] as const;
}
