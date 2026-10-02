import { useEffect } from "react";
import { Outlet } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import type { Size } from "~/services/config";
import type { StoreError } from "~/store/error";
import { service } from "~/services";
import { useStream } from "~/components/Loader";

/** Applies a size to the DOM (`<body>` class drives the `small:` variants). */
function applySize(size: Size) {
  document.body.classList.toggle("small", size === "small");
}

export default function Layout() {
  return (
    <>
      <ApplySize />
      <Outlet />
    </>
  );
}

function ApplySize() {
  const res = useStream(service.config.size.changes);
  const size = res.type === "success" ? res.data : null;
  useEffect(() => {
    if (size !== null) applySize(size);
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
