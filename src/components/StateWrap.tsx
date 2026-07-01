import { useEffect, useState } from "react";
import { Status } from "~/lib/state";

export function StateWrap<E>({
  loader,
  children,
  loading,
  error,
}: {
  loader: () => Promise<E | null>;
  children: React.ReactNode;
  error: (error: E) => React.ReactNode;
  loading?: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status<E>>({ state: "loading" });
  useEffect(() => {
    async function init() {
      const error = await loader();
      if (error !== null) {
        setStatus({ error, state: "error" });
      } else {
        setStatus({ state: "success" });
      }
    }
    init()
  }, [loader]);
  switch (status.state) {
    case "loading":
      return loading;
    case "error":
      return error(status.error);
  }
  return children;
}
