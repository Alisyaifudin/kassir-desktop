import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import { Package } from "lucide-react";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { cn } from "~/lib/utils";
import { Spinner } from "./Spinner";

/**
 * `file` is the key `image.save` wrote the file under - the image's `image_name`
 * in the db, not its `image_id`. See `~/lib/image`.
 */

/**
 * Object urls are kept for the whole session so that re-mounting the same image
 * paints instantly instead of reading the file (and flashing a spinner) again.
 */
const cache = new Map<string, string>();
/** keys currently rendered by a mounted <img>, skipped when evicting. */
const refs = new Map<string, number>();
/** concurrent mounts of the same key share one read. */
const inflight = new Map<string, Promise<string | null>>();
/** keys whose file is missing/corrupt, so we render the placeholder without retrying forever. */
const failed = new Set<string>();

const MAX_ENTRIES = 200;
/** start reading slightly before a card scrolls into view, so it is ready by then. */
const PREFETCH_MARGIN = "300px 0px";

type Status =
  | { kind: "none" }
  /** not read yet: only becomes visible when the card scrolls into view */
  | { kind: "waiting" }
  | { kind: "loading" }
  | { kind: "ready"; url: string }
  | { kind: "failed" };

function initialStatus(file: string | null, mime: DB.Mime | null): Status {
  if (file === null || mime === null) return { kind: "none" };
  const url = cache.get(file);
  if (url !== undefined) return { kind: "ready", url };
  if (failed.has(file)) return { kind: "failed" };
  return { kind: "waiting" };
}

function touch(file: string) {
  const url = cache.get(file);
  if (url === undefined) return;
  // re-insert so the Map order stays least-recently-used first
  cache.delete(file);
  cache.set(file, url);
}

function evict() {
  if (cache.size <= MAX_ENTRIES) return;
  for (const file of cache.keys()) {
    if (cache.size <= MAX_ENTRIES) return;
    // never revoke a url that a mounted <img> is still displaying
    if ((refs.get(file) ?? 0) > 0) continue;
    const url = cache.get(file);
    cache.delete(file);
    if (url !== undefined) URL.revokeObjectURL(url);
  }
}

function load(file: string, mime: DB.Mime) {
  const running = inflight.get(file);
  if (running !== undefined) return running;
  const promise = Effect.runPromise(image.load(file, mime))
    .then((url) => {
      cache.set(file, url);
      evict();
      return url;
    })
    .catch((error: unknown) => {
      failed.add(file);
      log.error(toError(error));
      return null;
    })
    .finally(() => {
      inflight.delete(file);
    });
  inflight.set(file, promise);
  return promise;
}

function toError(error: unknown): Error | string {
  if (error instanceof Error) return error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "e" in error) {
    const cause = (error as { e: unknown }).e;
    if (cause instanceof Error) return cause;
  }
  return String(error);
}

/** Drops every cached object url, e.g. after an image was deleted or replaced. */
export function clearImageCache() {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
  inflight.clear();
  failed.clear();
}

export function LazyImage({
  file,
  mime,
  alt = "",
  className,
}: {
  file: string | null;
  mime: DB.Mime | null;
  alt?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>(() => initialStatus(file, mime));
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file === null) return;
    const next = (refs.get(file) ?? 0) + 1;
    refs.set(file, next);
    return () => {
      if (next <= 1) refs.delete(file);
      else refs.set(file, next - 1);
    };
  }, [file]);

  // wait for the element to come into view before reading its file; lists can hold
  // dozens of cards and reading all of them up front is both slow and wasteful
  useEffect(() => {
    setVisible(false);
    if (file === null) return;
    // nothing to wait for when the read already happened (or is known to fail)
    if (cache.has(file) || failed.has(file)) return;
    const element = ref.current;
    if (element === null) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [file]);

  useEffect(() => {
    if (file === null || mime === null) {
      setStatus({ kind: "none" });
      return;
    }
    const cached = cache.get(file);
    if (cached !== undefined) {
      touch(file);
      setStatus({ kind: "ready", url: cached });
      return;
    }
    if (failed.has(file)) {
      setStatus({ kind: "failed" });
      return;
    }
    if (!visible) {
      setStatus({ kind: "waiting" });
      return;
    }
    setStatus({ kind: "loading" });
    let alive = true;
    void load(file, mime).then((url) => {
      // when unmounted mid-read the url stays cached, so the next mount is instant
      if (!alive) return;
      setStatus(url === null ? { kind: "failed" } : { kind: "ready", url });
    });
    return () => {
      alive = false;
    };
  }, [file, mime, visible]);

  return (
    <div ref={ref} className={cn("flex size-full items-center justify-center gap-1", className)}>
      {status.kind === "ready" ? (
        <img
          src={status.url}
          alt={alt}
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        <>
          <Package
            className={cn(
              "icon",
              status.kind === "failed" ? "text-destructive/30" : "text-muted-foreground/40",
            )}
          />
          <Spinner when={status.kind === "loading"} />
        </>
      )}
    </div>
  );
}
