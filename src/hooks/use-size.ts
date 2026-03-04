import { Effect, pipe } from "effect";
import { useSyncExternalStore } from "react";
import { log } from "~/lib/log";
import { store } from "~/store-effect";
import { Size } from "~/store-effect/size/get";

let inMemorySize: Size = "big";

function getSnapshot() {
  return inMemorySize;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function useSize() {
  const size = useSyncExternalStore(subscribe, getSnapshot);
  return size;
}

export async function setSize(size: Size) {
  const errMsg = await Effect.runPromise(program(size));
  if (errMsg === null) {
    inMemorySize = size;
    if (size === "big") {
      document.body.classList.remove("small");
    } else {
      document.body.classList.add("small");
    }
    notify();
    return null;
  } else {
    return errMsg;
  }
}

function program(size: Size) {
  return pipe(
    store.size.set(size),
    Effect.as(null),
    Effect.catchTag("StoreError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
