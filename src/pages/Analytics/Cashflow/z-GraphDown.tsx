import { useState } from "react";
import { getTicks } from "../utils/group-items";
import { Tooltip } from "~/components/Tooltip";
import { formatTick } from "../utils/format-tick";
import { Link } from "react-router";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function GraphDown({
  vals,
  debts,
}: {
  vals: { number: number; timestamp: number }[];
  debts: { number: number; timestamp: number }[];
}) {
  const maxVal = vals.length === 0 ? 1 : Math.max(...vals.map((v) => v.number));
  const ticks = getTicks(maxVal);
  return (
    <div className="flex gap-1 w-full h-full">
      <div className="relative h-full border-r w-[80px] small:w-[60px]">
        {ticks.map((tick) => (
          <p
            key={tick}
            className="right-1 absolute"
            style={{ top: `${(tick / (maxVal || 1)) * 100}%` }}
          >
            {formatTick(tick)}
          </p>
        ))}
      </div>
      <div className="w-full h-full flex-1 flex gap-1">
        {vals.map((v, i) => (
          <BarWithDebt
            base="/analytics"
            v={v.number}
            timestamp={v.timestamp}
            key={i}
            maxVal={maxVal}
            length={vals.length}
            debt={debts[i].number}
          />
        ))}
      </div>
    </div>
  );
}

function BarWithDebt({
  v,
  maxVal,
  length,
  debt,
  timestamp,
  base,
}: {
  v: number;
  debt: number;
  maxVal: number;
  length: number;
  timestamp: number;
  base: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const urlBack = useGenerateUrlBack(base);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };
  return (
    <Link
      to={`/records?time=${timestamp}&mode=buy&url_back=${encodeURIComponent(urlBack)}`}
      className="h-full"
      style={{ width: `${100 / (length || 0)}%` }}
    >
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onMouseMove={handleMouseMove}
        className="h-full relative group flex hover:bg-zinc-100"
      >
        <div
          className="flex flex-col w-full"
          style={{ height: `${maxVal === 0 ? 0 : (100 * v) / maxVal}%` }}
        >
          <div
            style={{ height: `${maxVal === 0 ? 0 : (100 * (v - debt)) / (v || 1)}%` }}
            className="w-full bg-red-500 group-hover:bg-red-500/60"
          />
          <div
            style={{ height: `${maxVal === 0 ? 0 : (100 * debt) / (v || 1)}%` }}
            className="w-full bg-red-400 group-hover:bg-red-400/60"
          />
        </div>
        <Tooltip position={position} visible={isVisible}>
          <p>{(v - debt).toLocaleString("id-ID")}</p>
          {debt === 0 ? null : <p>{debt.toLocaleString("id-ID")}</p>}
        </Tooltip>
      </div>
    </Link>
  );
}
