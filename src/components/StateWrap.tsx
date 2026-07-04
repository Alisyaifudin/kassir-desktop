import { Effect } from "effect";
import { useEffect, useState } from "react";
import { promisify } from "~/lib/promisify";
import { Status } from "~/lib/state";

export function StateWrap<T, E>({
  loader,
  children,
  loading,
  error,
}: {
  loader: () => Effect.Effect<T, E>;
  children: React.ReactNode;
  error: (error: E) => React.ReactNode;
  loading?: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status<E>>({ state: "loading" });
  useEffect(() => {
    async function init() {
      const error = await promisify(loader)
      if (error !== null) {
        setStatus({ error, state: "error" });
      } else {
        setStatus({ state: "success" });
      }
    }
    init();
  }, [loader]);
  switch (status.state) {
    case "loading":
      return loading;
    case "error":
      return error(status.error);
  }
  return children;
}
