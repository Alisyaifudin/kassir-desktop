import { Effect } from "effect";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { db } from "~/database";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { promisify } from "~/lib/promisify";
import { Result } from "~/lib/result";
import { ErrorComponent } from "~/components/ErrorComponent";
import { useUser } from "~/hooks/use-user";
import { Loading } from "./z-Loading";
import { DeleteImg } from "./z-DeleteImg";
import { ImageControl } from "./z-ImageControl";
import { useSelected } from "./use-selected";
import { useChange } from "./use-change";
import { useContainerSize, useControlSize } from "./use-container-size";
import { ImageResult, useData } from "./use-data";
import { useId } from "../use-id";

// ── Effect programs ──────────────────────────────────────────────

function addProgram(productId: string, file: File) {
  return Effect.gen(function* () {
    if (file.size > 10 * 1e6) return yield* Effect.fail("Ukuran maksimum 10 MB");
    const parsedMime = z.enum(["image/jpeg", "image/png"]).safeParse(file.type);
    if (!parsedMime.success) return yield* Effect.fail("Format gambar tidak didukung");
    const now = Temporal.Now.instant().epochMilliseconds;
    const rawName = file.name.replace(/\s+/g, "-");
    const name = `${now}-${rawName}`;
    yield* image.save(file, name);
    yield* db.image.add.one({ name, mime: parsedMime.data, productId });
  }).pipe(
    Effect.catchAll((e) => {
      if (typeof e === "string") return Effect.fail(e);
      log.error(e);
      return Effect.fail("Terjadi kesalahan");
    }),
  );
}

function delProgram(productId: string, id: string) {
  return Effect.gen(function* () {
    yield* db.image.del.byId(productId, id);
    yield* image.del(id);
  }).pipe(
    Effect.catchAll((e) => {
      switch ((e as { _tag: string })._tag) {
        case "DbError":
        case "IOError":
          log.error((e as { e: Error }).e);
          return Effect.fail((e as { e: Error }).e.message);
      }
      log.error(e);
      return Effect.fail("Terjadi kesalahan");
    }),
  );
}

function swapProgram(a: string, b: string) {
  return db.image.update.swap(a, b).pipe(
    Effect.catchAll((e) => {
      switch ((e as { _tag: string })._tag) {
        case "DbError":
          log.error((e as { e: Error }).e);
          return Effect.fail((e as { e: Error }).e.message);
        case "NotFound":
          log.error((e as { msg: string }).msg);
          return Effect.fail((e as { msg: string }).msg);
      }
      log.error(e);
      return Effect.fail("Terjadi kesalahan");
    }),
  );
}

// ── Page ─────────────────────────────────────────────────────────

const page = Effect.gen(function* () {
  const onAdd = (productId: string, file: File) =>
    promisify(
      () => addProgram(productId, file),
      (e: string) => e,
    );
  const onDelete = (productId: string, id: string) =>
    promisify(
      () => delProgram(productId, id),
      (e: string) => e,
    );
  const onSwap = (a: string, b: string) =>
    promisify(
      () => swapProgram(a, b),
      (e: string) => e,
    );

  return function Page() {
    const id = useId();
    const res = useData();
    return Result.match(res, {
      onLoading() {
        return <Loading />;
      },
      onError(error) {
        log.error(error.e);
        return <ErrorComponent>{error.e.message}</ErrorComponent>;
      },
      onSuccess(images) {
        return (
          <ImageViewer
            images={images}
            productId={id}
            onAdd={onAdd}
            onDelete={onDelete}
            onSwap={onSwap}
          />
        );
      },
    });
  };
});

export default page;

// ── Pure React component ─────────────────────────────────────────

function ImageViewer({
  images,
  productId,
  onAdd,
  onDelete,
  onSwap,
}: {
  images: ImageResult[];
  productId: string;
  onAdd: (productId: string, file: File) => Promise<string | null>;
  onDelete: (productId: string, id: string) => Promise<string | null>;
  onSwap: (a: string, b: string) => Promise<string | null>;
}) {
  const [selected, setSelected] = useSelected(images);
  const [index, handlePrev, handleNext] = useChange(images);
  const [refContainer, container] = useContainerSize();
  const [ref, control] = useControlSize();
  const role = useUser().role;

  return (
    <div ref={refContainer} className="flex flex-col gap-1 flex-1 w-full min-h-0">
      <div className="flex-1 min-h-0 justify-center items-center flex">
        <Button
          className="h-full px-0"
          variant="secondary"
          onClick={handlePrev}
          disabled={index <= 0}
        >
          <ChevronLeft />
        </Button>
        <div
          style={{ height: container.height - control.height }}
          className="relative flex-1 min-h-0 flex justify-center items-center overflow-hidden"
        >
          <img className="max-w-full max-h-full object-contain" src={selected?.href} />
          {selected && role === "admin" ? (
            <DeleteImg
              selected={selected}
              productId={productId}
              onDelete={onDelete}
            />
          ) : null}
        </div>
        <Button
          className="h-full px-0"
          variant="secondary"
          disabled={index === images.length - 1}
          onClick={handleNext}
        >
          <ChevronRight />
        </Button>
      </div>
      <div ref={ref} className="flex flex-col w-full min-h-0">
        <div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
          {images.map((image, i) => (
            <button
              key={i}
              className="h-32 aspect-square p-0.5"
              onClick={() => setSelected(image.id)}
            >
              <Thumbnail image={image} selected={selected!} />
            </button>
          ))}
        </div>
        <ImageControl
          images={images}
          selected={selected}
          productId={productId}
          onAdd={onAdd}
          onSwap={onSwap}
        />
      </div>
    </div>
  );
}

function Thumbnail({
  image,
  selected,
}: {
  image: ImageResult;
  selected: ImageResult;
}) {
  return (
    <img
      className={cn("object-contain w-full h-full", {
        outline: selected.id === image.id,
      })}
      src={image.href}
    />
  );
}
