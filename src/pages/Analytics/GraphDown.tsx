import { useState } from "react";
import { getTicks } from "./utils/group-items";
import { Tooltip } from "~/components/Tooltip";

export function GraphDown({ vals, debts }: { vals: number[]; debts: number[] }) {
  const maxVal = Math.max(...vals);
  const ticks = getTicks(maxVal);
  return (
    <div className="flex gap-1 w-full h-full">
      <div className="relative h-full border-r w-[100px]">
        {ticks.map((tick) => (
          <p key={tick} className="right-1 absolute" style={{ top: `${(tick / maxVal) * 100}%` }}>
            {tick.toLocaleString("id-ID")}
          </p>
        ))}
      </div>
      <div className="w-full h-full flex-1 flex gap-1">
        {vals.map((v, i) => (
          <BarWithDebt v={v} key={i} maxVal={maxVal} length={vals.length} debt={debts[i]} />
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
}: {
  v: number;
  debt: number;
  maxVal: number;
  length: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };
  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseMove={handleMouseMove}
      className="h-full relative group flex hover:bg-zinc-100"
      style={{ width: `${100 / length}%` }}
    >
      <div
        className="flex flex-col w-full"
        style={{ height: `${maxVal === 0 ? 0 : (100 * v) / maxVal}%` }}
      >
        <div
          style={{ height: `${maxVal === 0 ? 0 : (100 * (v - debt)) / v}%` }}
          className="w-full bg-red-500 group-hover:bg-red-500/60"
        />
        <div
          style={{ height: `${maxVal === 0 ? 0 : (100 * debt) / v}%` }}
          className="w-full bg-red-400 group-hover:bg-red-400/60"
        />
      </div>
      <Tooltip position={position} visible={isVisible}>
        <p>{(v - debt).toLocaleString("id-ID")}</p>
        {debt === 0 ? null : <p>{debt.toLocaleString("id-ID")}</p>}
      </Tooltip>
    </div>
  );
}
