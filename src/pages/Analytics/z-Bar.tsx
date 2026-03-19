import { useState } from "react";
import { cn } from "~/lib/utils";
import { Tooltip } from "~/components/Tooltip";
import { Link } from "react-router";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function Bar({
  orientation,
  v,
  maxVal,
  length,
  timestamp,
  base,
}: {
  orientation: "up" | "down";
  v: number;
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
      to={`/records?time=${timestamp}&mode=${orientation === "up" ? "sell" : "buy"}&url_back=${encodeURIComponent(urlBack)}`}
      className="h-full"
      style={{ width: `${100 / (length || 1)}%` }}
    >
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onMouseMove={handleMouseMove}
        className={cn("h-full relative group flex hover:bg-zinc-100", {
          "items-end": orientation === "up",
        })}
      >
        <div
          className={cn(
            "w-full",
            orientation === "up"
              ? "bg-emerald-500 group-hover:bg-emerald-500/60"
              : "bg-red-500 group-hover:bg-red-500/60",
          )}
          style={{ height: `${(100 * v) / (maxVal || 1)}%` }}
        />
        <Tooltip position={position} visible={isVisible}>
          <p>{v.toLocaleString("id-ID")}</p>
        </Tooltip>
      </div>
    </Link>
  );
}
