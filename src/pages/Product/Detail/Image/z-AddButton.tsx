import { useRef, useState } from "react";
import { Effect } from "effect";
import { ImagePlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { image } from "~/lib/image";
import { service } from "~/services";
import type { Mime } from "~/services/product";

const MAX_SIZE = 10 * 1e6;

function mimeOf(type: string): Mime | null {
  if (type === "image/png" || type === "image/jpeg") return type;
  return null;
}

export function AddButton({
  productId,
  disabled,
  onAdded,
}: {
  productId: string;
  disabled?: boolean;
  onAdded?: (imageId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > MAX_SIZE) {
      setError("Ukuran maksimum 10 MB.");
      return;
    }
    const mime = mimeOf(file.type);
    if (mime === null) {
      setError("Format harus PNG atau JPEG.");
      return;
    }

    setBusy(true);
    setError(null);

    const name = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const saved = await Effect.runPromise(image.save(file, name).pipe(Effect.either));
    if (saved._tag === "Left") {
      setError(saved.left.e.message);
      setBusy(false);
      return;
    }

    const added = await Effect.runPromise(
      service.product.set.image.add(productId, { name, mime }).pipe(Effect.either),
    );
    if (added._tag === "Left") {
      setError(added.left.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    onAdded?.(added.right);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="gap-1"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="size-4" />
        {busy ? "Menyimpan…" : "Tambah gambar"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
