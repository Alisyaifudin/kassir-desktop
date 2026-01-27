import { Effect, Exit } from "effect";
import { useEffect, useState } from "react";

export function Resolve<A, E = never>({
  effect,
  children,
  fallback = null,
}: {
  effect: Effect.Effect<A, E>;
  children?: (exit: Exit.Exit<A, E>) => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [exit, setExit] = useState<null | Exit.Exit<A, E>>(null);
  useEffect(() => {
    Effect.runPromiseExit(effect).then((exit) => setExit(exit));
  }, []);
  if (exit === null) return fallback;
  return children?.(exit);
}
