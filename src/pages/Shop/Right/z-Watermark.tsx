import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";
import { useMode } from "../use-transaction";

export function Watermark({ children }: { children?: React.ReactNode }) {
  const size = useSize();
  const mode = useMode();
  return (
    <div
      className={cn("relative flex flex-1 flex-col overflow-y-auto min-h-0 h-full scroll-gutter", {
        "bg-blue-50": mode === "buy",
      })}
    >
      {children}
      <span
        className={cn(
          css.mode[size],
          { hidden: mode === "sell" },
          "fixed pointer-events-none opacity-5 -translate-y-1/2 translate-x-1/2 -rotate-45 top-1/2 left-1/2",
        )}
      >
        BELI
      </span>
    </div>
  );
}
