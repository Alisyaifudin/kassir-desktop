import { Effect } from "effect";
import { useStream } from "~/components/Loader";
import { service } from "~/services";
import type { Size } from "~/services/config";

export type { Size };

/** Reads the persisted UI size. */
export function useSize(): Size {
  const res = useStream(service.config.size.changes, () =>
    Effect.runSync(service.config.size.get()),
  );
  return res.type === "success" ? res.data : "big";
}
