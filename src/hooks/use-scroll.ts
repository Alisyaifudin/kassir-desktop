import { useRef, useCallback } from "react";

export function useScroll() {
  const parentRef = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback(() => {
    // no-op — scroll shadow detection to be implemented
  }, []);
  return [parentRef, handleScroll] as const;
}
