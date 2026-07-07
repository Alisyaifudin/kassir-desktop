import { Effect } from "effect";
import { ProductService } from "~/services/product";
import type { HistoryEvent } from "~/services/product/type";
import { ConfigService } from "~/services/config";
import { DateService } from "~/services/date";
import { WithLoader } from "~/components/WithLoader";
import { ErrorComponent } from "~/components/ErrorComponent";
import { useId } from "../use-id";
import { usePreset, useCustomRange, computeRange } from "./use-range";
import { useDeltaFilter } from "./use-mode";
import { getBins, filterAndAggregate } from "./util-bins";
import { Loading } from "./z-Loading";
import { Panel } from "./z-Panel";
import { Graph } from "./z-Graph";

/** For "all" preset, use actual data bounds instead of the sentinel range */
function actualBound(
  events: HistoryEvent[],
  preset: ReturnType<typeof usePreset>["preset"],
  fallback: number,
  now: number,
  pick: "min" | "max",
): number {
  if (preset !== "all") return fallback;
  if (events.length === 0) return now;
  return pick === "min"
    ? Math.min(...events.map((e) => e.timestamp))
    : Math.max(...events.map((e) => e.timestamp));
}

const page = Effect.gen(function* () {
  const productService = yield* ProductService;
  const configService = yield* ConfigService;
  const dateService = yield* DateService;

  const useSize = () => configService.size.useSize();
  const nowFn = () => dateService.now();
  const todayDateFn = () => dateService.todayDate();
  const tzFn = () => dateService.timeZoneId();

  return function Page() {
    const id = useId();
    const { preset, setPreset } = usePreset();
    const { customStart, customEnd, setCustomRange } = useCustomRange();
    const [delta] = useDeltaFilter();
    const size = useSize();
    const tz = tzFn();
    const now = nowFn();
    const [start, end] = computeRange(preset, customStart, customEnd, { now: nowFn, todayDate: todayDateFn, timeZoneId: tzFn });

    return (
      <div className="flex flex-col gap-1 flex-1">
        <Panel
          size={size}
          preset={preset}
          start={start}
          end={end}
          tz={tz}
          onPresetChange={setPreset}
          onCustomRangeChange={setCustomRange}
        />
        <WithLoader
          loader={() => productService.get.events(id)}
          loading={<Loading />}
          error={(error, retry) => (
            <ErrorComponent status={500}>
              {error.e.message}
              <button onClick={retry}>Coba lagi</button>
            </ErrorComponent>
          )}
        >
          {(events) => {
            const s = actualBound(events, preset, start, now, "min");
            const e = actualBound(events, preset, end, now, "max");
            const bins = getBins(s, e, tz);
            const data = filterAndAggregate(events, bins, s, e, delta, tz);
            return <Graph data={data} delta={delta} />;
          }}
        </WithLoader>
      </div>
    );
  };
});

export default page;
