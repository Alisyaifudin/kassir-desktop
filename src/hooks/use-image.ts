import { useEffect, useState } from "react";
import { Effect } from "effect";
import { image } from "~/lib/image";
import type { Mime } from "~/services/product";

/** Resolves a stored image file to an object URL; revokes it on unmount. */
export function useImageUrl(name: string | null, mime: Mime | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (name === null || mime === null) {
      setUrl(null);
      return;
    }

    let active = true;
    let created: string | null = null;

    Effect.runPromise(image.load(name, mime))
      .then((next) => {
        if (active) {
          created = next;
          setUrl(next);
        } else {
          URL.revokeObjectURL(next);
        }
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => {
      active = false;
      if (created !== null) URL.revokeObjectURL(created);
    };
  }, [name, mime]);

  return url;
}
