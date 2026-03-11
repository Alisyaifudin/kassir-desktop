import { useSyncExternalStore } from "react";
import { _user } from "~/lib/auth";

function getSnapshot() {
  return _user;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function subscribe(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useUser() {
  const user = useSyncExternalStore(subscribe, getSnapshot);
  if (user === undefined) throw new Error("user is undefined");
  return user;
}
