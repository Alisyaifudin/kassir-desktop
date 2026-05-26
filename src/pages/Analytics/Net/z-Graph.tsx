import { getTicks } from "../utils/group-items";
import { Bar } from "../z-Bar";
import { formatTick } from "../utils/format-tick";

export function Graph({
  profits,
  labels,
}: {
  profits: { number: number; timestamp: number }[];
  labels: string[];
}) {
  return (
    <div className="flex flex-col flex-1 py-5">
      <GraphBar orientation="up" vals={profits} />
      <div className="flex w-full h-[70px] small:h-[50px]">
        <div className="w-[80px] small:w-[60px]"></div>
        <div className="flex-1 flex gap-1">
          {labels.map((label) => (
            <div
              key={label}
              className="flex justify-center items-center"
              style={{ width: `${100 / (labels.length || 1)}%` }}
            >
              <p className="text-small! absolute">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <GraphBar orientation="down" vals={profits} />
    </div>
  );
}

function GraphBar({
  vals,
  orientation,
}: {
  vals: { number: number; timestamp: number }[];
  orientation: "up" | "down";
}) {
  const maxRaw = vals.length === 0 ? 1 : Math.max(...vals.map((v) => v.number));
  const maxVal = Math.max(maxRaw, -1 * maxRaw);
  const ticks = getTicks(maxVal);
  return (
    <div className="flex gap-1 w-full h-full">
      <div className="relative h-full border-r w-[80px] small:w-[60px]">
        {ticks.map((tick) => (
          <p
            key={tick}
            className="right-1 absolute"
            style={{
              top: `${((orientation === "up" ? maxVal - tick : tick) / (maxVal || 1)) * 100}%`,
            }}
          >
            {formatTick(tick)}
          </p>
        ))}
      </div>
      {orientation === "up" ? (
        <div className="w-full h-full flex-1 flex gap-1 items-end">
          {vals.map((v, i) =>
            v.number < 0.0001 ? (
              <div key={i} style={{ width: `${100 / (vals.length || 1)}%` }} />
            ) : (
              <Bar
                base="/analytics/net"
                timestamp={v.timestamp}
                orientation={orientation}
                v={v.number}
                key={i}
                maxVal={maxVal}
                length={vals.length}
              />
            ),
          )}
        </div>
      ) : (
        <div className="w-full h-full flex-1 flex gap-1">
          {vals.map((v, i) =>
            v.number > -0.0001 ? (
              <div key={i} style={{ width: `${100 / (vals.length || 1)}%` }} />
            ) : (
              <Bar
                base="/analytics/net"
                timestamp={v.timestamp}
                orientation={orientation}
                v={-v.number}
                key={i}
                maxVal={maxVal}
                length={vals.length}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
