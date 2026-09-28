import { useEffect } from "react";
import { Outlet } from "react-router";
import { Effect } from "effect";
import { store } from "~/store";
import { Skeleton } from "~/components/ui/skeleton";
import { Consumer, createLoader, Loader } from "~/components/Loader";
import type { Size } from "~/store/size/get";
import type { StoreError } from "~/store/error";

/** Applies a size to the DOM (`<body>` class drives the `small:` variants). */
function applySize(size: Size) {
  document.body.classList.toggle("small", size === "small");
}

/**
 * Reads the persisted UI size and applies it before the app renders, so we
 * never flash the wrong layout.
 */
export const sizeLoader = createLoader(
  store.size.get().pipe(Effect.tap((size) => Effect.sync(() => applySize(size)))),
);

export default function Layout() {
  return (
    <Loader loader={sizeLoader}>
      <Consumer Error={Error} loader={sizeLoader} loading={<Loading />}>
        <ApplySize />
        <Outlet />
      </Consumer>
    </Loader>
  );
}

/**
 * Keeps the `<body>` class in sync with the loader, so optimistic updates and
 * rollbacks both reflect in the DOM.
 */
function ApplySize() {
  const size = sizeLoader.useData();
  useEffect(() => {
    applySize(size);
  }, [size]);
  return null;
}

function Loading() {
  return (
    <div className="max-h-screen max-w-screen flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <Skeleton className="h-10 w-48" />
      <div className="w-full max-w-3xl grid grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
    </div>
  );
}

/**
 * A `StoreError` is an expected, typed failure. Rather than swallow it, re-throw
 * the underlying error during render so the route-level ErrorBoundary renders
 * the standard error screen (with reload/back actions).
 */
function Error({ error }: { error: StoreError }): never {
  throw error.e;
}
