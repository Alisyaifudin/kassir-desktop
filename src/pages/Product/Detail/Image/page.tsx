import { useEffect, useState } from "react";
import { Effect } from "effect";
import { ImageOff } from "lucide-react";
import { Loader, useStream } from "~/components/Loader";
import { NotFound } from "~/components/NotFound";
import { TextError } from "~/components/TextError";
import { useUser } from "~/hooks/use-user";
import { image } from "~/lib/image";
import { service } from "~/services";
import type { ProductFull, ProductImage } from "~/services/product";
import { useId } from "../use-id";
import { AddButton } from "./z-AddButton";
import { Loading } from "./z-Loading";
import { Preview } from "./z-Preview";
import { ThumbRail } from "./z-ThumbRail";

export default function Page() {
  const id = useId();
  const res = useStream(service.product.get.changesFull);
  const role = useUser().role;

  return (
    <Loader res={res} fallback={<Loading />}>
      {({ data: products }) => {
        const product = products.find((item) => item.id === id);
        if (product === undefined) return <NotFound />;
        return <Manager product={product} canManage={role === "admin"} />;
      }}
    </Loader>
  );
}

function Manager({ product, canManage }: { product: ProductFull; canManage: boolean }) {
  const images = product.images;
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null || !images.some((item) => item.id === selectedId)) {
      setSelectedId(images[0]?.id ?? null);
    }
  }, [images, selectedId]);

  const selectedIndex = Math.max(
    0,
    images.findIndex((item) => item.id === selectedId),
  );
  const selected = images[selectedIndex] ?? null;

  async function reorder(ids: string[]) {
    if (ids.length < 2) return;
    setBusy(true);
    setError(null);
    const result = await Effect.runPromise(
      service.product.set.image.reorder(product.id, ids).pipe(Effect.either),
    );
    setBusy(false);
    if (result._tag === "Left") setError(result.left.message);
  }

  async function handleDelete(target: ProductImage) {
    if (!window.confirm("Hapus gambar ini?")) return;
    setBusy(true);
    setError(null);
    const removed = await Effect.runPromise(
      service.product.set.image.remove(product.id, target.id).pipe(Effect.either),
    );
    if (removed._tag === "Left") {
      setError(removed.left.message);
      setBusy(false);
      return;
    }
    const fileResult = await Effect.runPromise(image.del(target.name).pipe(Effect.either));
    if (fileResult._tag === "Left") setError(fileResult.left.e.message);
    setBusy(false);
  }

  function handleSetCover(target: ProductImage) {
    const ids = [
      target.id,
      ...images.filter((item) => item.id !== target.id).map((item) => item.id),
    ];
    void reorder(ids);
  }

  return (
    <main className="flex h-full flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="font-semibold">Gambar</h2>
          <p className="text-normal text-muted-foreground">{images.length} gambar</p>
        </div>
        {canManage && images.length > 0 ? (
          <AddButton
            productId={product.id}
            disabled={busy}
            onAdded={(imageId) => setSelectedId(imageId)}
          />
        ) : null}
      </header>

      <TextError>{error}</TextError>

      {images.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-muted-foreground">
          <ImageOff className="size-12" />
          <p className="text-normal">Belum ada gambar.</p>
          {canManage ? (
            <AddButton productId={product.id} onAdded={(imageId) => setSelectedId(imageId)} />
          ) : null}
        </div>
      ) : (
        <>
          <Preview
            image={selected}
            canManage={canManage}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex < images.length - 1}
            isCover={selectedIndex === 0}
            disabled={busy}
            onPrev={() => setSelectedId(images[selectedIndex - 1]?.id ?? selectedId)}
            onNext={() => setSelectedId(images[selectedIndex + 1]?.id ?? selectedId)}
            onSetCover={() => selected !== null && handleSetCover(selected)}
            onDelete={() => selected !== null && void handleDelete(selected)}
          />
          <ThumbRail
            images={images}
            selectedId={selected?.id ?? null}
            disabled={busy}
            canManage={canManage}
            onSelect={setSelectedId}
            onDelete={(target) => void handleDelete(target)}
            onReorder={(ids) => void reorder(ids)}
          />
        </>
      )}
    </main>
  );
}
