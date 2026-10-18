import { useRef, useState } from "react";
import { Effect } from "effect";
import { ImagePlus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { useImageUrl } from "~/hooks/use-image";
import { service } from "~/services";
import type { Draft, DraftImage } from "~/services/transaction";
import { run } from "../run";

/**
 * Photos of the purchase — the nota, the goods, whatever the operator needs to
 * remember it by. The bytes live on disk and the draft only holds the
 * reference, so abandoning the draft cleans both up (see the transaction
 * service); submitting moves the reference onto the record instead.
 */
export function Images({ draft }: { draft: Draft }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftImage | null>(null);

  async function handleFiles(files: File[]) {
    setBusy(true);
    setError(null);
    for (const file of files) {
      const result = await Effect.runPromise(
        service.transaction.images.add(draft.id, file).pipe(Effect.either),
      );
      if (result._tag === "Left") {
        setError(result.left.message);
        break;
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-2 py-2">
      <span className="text-small text-muted-foreground select-none">Gambar nota</span>

      {draft.images.map((image) => (
        <Thumb
          key={image.id}
          image={image}
          onPreview={() => setPreview(image)}
          onRemove={() => run(service.transaction.images.remove(draft.id, image.id))}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="icon" />
        {busy ? "Menyimpan…" : "Tambah"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          // Snapshot before resetting: clearing the input empties `files`.
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length > 0) void handleFiles(files);
        }}
      />

      {error !== null ? <span className="text-small text-destructive">{error}</span> : null}

      <Dialog open={preview !== null} onOpenChange={(open) => (open ? undefined : setPreview(null))}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Gambar</DialogTitle>
          {preview !== null ? <Full image={preview} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Thumb({
  image,
  onPreview,
  onRemove,
}: {
  image: DraftImage;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const url = useImageUrl(image.name, image.mime);
  return (
    <div className="group relative size-16 overflow-hidden rounded-md border small:size-12">
      <button type="button" className="size-full" onClick={onPreview} aria-label="Lihat gambar">
        {url !== null ? <img src={url} alt="" className="size-full object-cover" /> : null}
      </button>
      <Button
        variant="destructive"
        size="icon"
        title="Hapus gambar"
        className="absolute right-0 top-0 size-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onRemove}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}

function Full({ image }: { image: DraftImage }) {
  const url = useImageUrl(image.name, image.mime);
  return url !== null ? (
    <img src={url} alt="" className="max-h-[70vh] w-full object-contain" />
  ) : null;
}
