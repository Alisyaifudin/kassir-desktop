import { useEffect, useState } from "react";
import { queue } from "./utils/queue";

export function useStatus() {
  const [status, setStatus] = useState<"idle" | "active">(() => {
    if (queue.size === 0 && queue.pending === 0) return "idle";
    return "active";
  });

  useEffect(() => {
    const handleIdle = () => setStatus("idle");
    const handleActive = () => setStatus("active");

    queue.on("idle", handleIdle);
    queue.on("active", handleActive);

    return () => {
      queue.off("idle", handleIdle);
      queue.off("active", handleActive);
    };
  }, []);

  return status;
}
