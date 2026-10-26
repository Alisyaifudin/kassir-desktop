import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { z } from "zod";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { generateId } from "~/lib/random";
import { service } from "~/services";
import type { Mime, ProductImage } from "~/services/product";

/** A picked file that is not in the db yet. */
type Draft = {
  /** local id, used as the row id when the draft is committed */
  id: string;
  /** on-disk key, stored as `image_name` on commit */
  name: string;
  mime: Mime;
  file: File;
  /** object url of the picked file, for the strip and the preview */
  href: string;
};

/** What the strip renders: a saved row and a draft look the same from outside. */
export type GalleryItem = {
  id: string;
  /** on-disk key: `image_name` for a saved row, the draft's name for a draft */
  file: string;
  /** saved rows carry their mime so the thumbnail can resolve the file */
  mime: Mime | null;
  /** object url for a draft; a saved row resolves its own */
  href: string | null;
  /** set while the image is a picked file that is not in the db yet */
  draft: Draft | null;
};

const MAX_FILE_SIZE = 10 * 1e6;
/**
 * Drafts are held in memory until Simpan, so the batch needs a ceiling: ten files
 * at the 10 MB limit is already 100 MB of the user's RAM.
 */
const MAX_DRAFTS = 10;
const MAX_DRAFT_SIZE = 50 * 1e6;
const MIME = z.enum(["image/jpeg", "image/png", "image/webp"]);

/**
 * The gallery of one product: the rows the service already has, plus the files
 * picked since the page was opened.
 *
 * Picked files stay drafts (a `File` in memory) until `save` writes them and
 * commits, so discarding one leaves nothing behind - writing the file at pick time
 * would leave an orphan on disk with no row pointing at it, and nothing collects
 * those. Reordering, in contrast, is written straight away: only the drafts need a
 * commit, since a saved row's position can be updated on the spot.
 */
export function useGallery(productId: string, images: ProductImage[]) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  /** the drag order, as ids; null until the user arranges anything */
  const [arranged, setArranged] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  // The blob URLs are released by discard/save, but those are only reachable
  // while the page is mounted. A till runs for weeks, so leaving the page with
  // unsaved drafts (up to 50 MB of files) used to pin them for the rest of the
  // session. This effect is the unmount backstop; revoking twice is a no-op.
  const draftsRef = useRef<Draft[]>([]);
  draftsRef.current = drafts;
  useEffect(
    () => () => {
      for (const draft of draftsRef.current) URL.revokeObjectURL(draft.href);
    },
    [],
  );

  const saved = useMemo<GalleryItem[]>(
    () =>
      images.map((image) => ({
        id: image.id,
        file: image.name,
        mime: image.mime,
        href: null,
        draft: null,
      })),
    [images],
  );

  const picked = useMemo<GalleryItem[]>(() => {
    const rows = new Set(images.map((image) => image.id));
    // a draft whose row is already in the db is a saved image now: the commit has
    // landed but the query has not caught up with it yet
    return drafts
      .filter((draft) => !rows.has(draft.id))
      .map((draft) => ({
        id: draft.id,
        file: draft.name,
        mime: draft.mime,
        href: draft.href,
        draft,
      }));
  }, [drafts, images]);

  const items = useMemo(() => {
    if (arranged === null) return [...saved, ...picked];
    const byId = new Map([...saved, ...picked].map((item) => [item.id, item]));
    const placed = arranged.flatMap((id) => byId.get(id) ?? []);
    const done = new Set(placed.map((item) => item.id));
    // whatever showed up after the arrangement - a new draft, a row the query just
    // returned - goes after it rather than being dropped
    return [...placed, ...[...saved, ...picked].filter((item) => !done.has(item.id))];
  }, [saved, picked, arranged]);

  /** Returns the ids of the drafts it took; the rest were rejected. */
  const add = useCallback(
    (files: File[]) => {
      const { accepted, rejected } = pick(files, drafts);
      report(rejected);
      if (accepted.length === 0) return [];
      setDrafts((prev) => [...prev, ...accepted]);
      return accepted.map((draft) => draft.id);
    },
    [drafts],
  );

  const discard = useCallback((draft: Draft) => {
    URL.revokeObjectURL(draft.href);
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
  }, []);

  const discardAll = useCallback(() => {
    drafts.forEach((draft) => URL.revokeObjectURL(draft.href));
    setDrafts([]);
  }, [drafts]);

  const move = useCallback(
    (next: GalleryItem[]) => {
      setArranged(next.map((item) => item.id));
      // only rows that exist can be written down; a draft keeps the position it was
      // dropped in and is given it by `commit` when it is saved
      const ids = next.filter((item) => item.draft === null).map((item) => item.id);
      Effect.runPromise(service.product.set.image.reorder(productId, ids)).catch(
        fail("Gagal menyimpan urutan"),
      );
    },
    [productId],
  );

  /** Writes the drafts and commits them. True when the gallery reached the db. */
  const save = useCallback(async () => {
    if (drafts.length === 0) return true;
    setSaving(true);
    const error = await Effect.runPromise(program(productId, items, drafts));
    if (error === null) {
      drafts.forEach((draft) => URL.revokeObjectURL(draft.href));
      setDrafts([]);
      setArranged(null);
    } else {
      toast.error(error);
    }
    setSaving(false);
    return error === null;
  }, [drafts, items, productId]);

  return {
    items,
    drafts,
    dirty: drafts.length > 0,
    saving,
    add,
    move,
    discard,
    discardAll,
    save,
  } as const;
}

function pick(files: File[], current: Draft[]) {
  const rejected = { size: 0, format: 0, full: 0 };
  const accepted: Draft[] = [];
  let bytes = current.reduce((total, draft) => total + draft.file.size, 0);
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      rejected.size += 1;
      continue;
    }
    const mime = MIME.safeParse(file.type);
    if (!mime.success) {
      rejected.format += 1;
      continue;
    }
    if (current.length + accepted.length >= MAX_DRAFTS || bytes + file.size > MAX_DRAFT_SIZE) {
      rejected.full += 1;
      continue;
    }
    bytes += file.size;
    const id = generateId();
    accepted.push({
      id,
      // the id leads the name so that a batch of same-named files (`IMG_0001.jpg`
      // from two folders) cannot write over each other - a timestamp prefix does
      // exactly that when several files are picked inside the same millisecond
      name: `${id}-${file.name.replace(/\s+/g, "-")}`,
      mime: mime.data,
      file,
      href: URL.createObjectURL(file),
    });
  }
  return { accepted, rejected };
}

function report(rejected: { size: number; format: number; full: number }) {
  if (rejected.size > 0) {
    toast.error(`${rejected.size} berkas dilewati: lebih dari ${MAX_FILE_SIZE / 1e6} MB`);
  }
  if (rejected.format > 0) {
    toast.error(`${rejected.format} berkas dilewati: format tidak didukung`);
  }
  if (rejected.full > 0) {
    toast.error(
      `${rejected.full} berkas dilewati: maksimum ${MAX_DRAFTS} gambar menunggu disimpan`,
    );
  }
}

/** Writes every draft file, then commits them all in one transaction. */
function program(productId: string, items: GalleryItem[], drafts: Draft[]) {
  return Effect.gen(function* () {
    const written: string[] = [];
    const result = yield* Effect.either(
      Effect.gen(function* () {
        for (const draft of drafts) {
          yield* image.save(draft.file, draft.name);
          written.push(draft.name);
        }
        yield* service.product.set.image.commit(
          productId,
          items.map((item) => item.id),
          drafts.map((draft) => ({ id: draft.id, name: draft.name, mime: draft.mime })),
        );
      }),
    );
    if (Either.isRight(result)) return null;
    // the files are on disk but their rows are not: undo the writes, since nothing
    // would ever point at them again
    yield* Effect.forEach(written, (name) => image.del(name).pipe(Effect.ignore), {
      concurrency: 1,
      discard: true,
    });
    const message = messageOf(result.left);
    log.error(result.left instanceof Error ? result.left : message);
    return message;
  });
}

function messageOf(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; e?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
    if (candidate.e instanceof Error) return candidate.e.message;
  }
  return "Gagal menyimpan gambar";
}

function fail(message: string) {
  return (error: unknown) => {
    log.error(error instanceof Error ? error : String(error));
    toast.error(message);
  };
}
