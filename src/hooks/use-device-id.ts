import { Stream } from "effect";
import { useQuery } from "~/components/Loader";
import { service } from "~/services";

/**
 * This installation's id, for the Settings header.
 *
 * A hook rather than a `useQuery` call inside the component for one reason: it is
 * the only place the screen touches `service`, so the header can be rendered in a
 * test without standing up the whole service graph.
 *
 * Minted on first read (`SyncService.config.deviceId`), not on first sync: a shop
 * that has never managed to sync is exactly when someone needs to read this out
 * loud, and an empty line would send them looking in the wrong place.
 */
export function useDeviceId(): string | null {
  const loaded = useQuery(() => Stream.fromEffect(service.sync.config.deviceId()), []);
  return loaded.type === "success" ? loaded.data : null;
}
