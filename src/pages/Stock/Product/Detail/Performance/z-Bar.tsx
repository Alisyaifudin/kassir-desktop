import { useState } from "react";
import { cn } from "~/lib/utils";
import { Tooltip } from "~/components/Tooltip";

export function Bar({
  orientation,
  v,
  maxVal,
  length,
}: {
  orientation: "up" | "down";
  v: number;
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
      className={cn("h-full relative group flex hover:bg-zinc-100", {
        "items-end": orientation === "up",
      })}
      style={{ width: `${100 / length}%` }}
    >
      <div
        className={cn(
          "w-full",
          orientation === "up"
            ? "bg-emerald-500 group-hover:bg-emerald-500/60"
            : "bg-red-500 group-hover:bg-red-500/60"
        )}
        style={{ height: `${(100 * v) / (maxVal === 0 ? 1 : maxVal)}%` }}
      />
      <Tooltip position={position} visible={isVisible}>
        <p>{v.toLocaleString("id-ID")}</p>
      </Tooltip>
    </div>
  );
}
