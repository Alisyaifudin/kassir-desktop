import { Effect } from "effect";
import { useStream } from "~/components/Loader";
import { Unauthenticated } from "~/lib/auth";
import { service } from "~/services";

/** The authenticated user. Throws `Unauthenticated` if there is none. */
export function useUser() {
  const res = useStream(service.auth.changes, () => Effect.runSync(service.auth.get()));
  if (res.type === "success" && res.data !== null) return res.data;
  throw new Unauthenticated("Unauthenticated");
}
