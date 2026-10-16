import { Reorder } from "motion/react";
import { useBlocker } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/Spinner";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { DeleteImg } from "./z-DeleteImg";
import { DiscardDraft } from "./z-DiscardDraft";
import { AddTile } from "./z-AddTile";
import { Thumb } from "./z-Thumb";
import { useSelected } from "./use-selected";
import { useChange } from "./use-change";
import { useGallery } from "./use-gallery";
import { useFileDrop } from "./use-file-drop";
import { useContainerSize, useControlSize } from "./use-container-size";
import { useId } from "../use-id";
import { ImageResult, useData } from "./use-data";
import { Result } from "~/lib/result";
import { ErrorComponent } from "~/components/ErrorComponent";
import { log } from "~/lib/log";
import { useUser } from "~/hooks/use-user";
import { Loading } from "./z-Loading";

export default function Page() {
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
      return <Wrapper images={images} />;
    },
  });
}

function Wrapper({ images }: { images: ImageResult[] }) {
  const id = useId();
  const gallery = useGallery(id, images);
  const [selected, setSelected] = useSelected(gallery.items);
  const [index, handlePrev, handleNext] = useChange(gallery.items);
  const [refContainer, container] = useContainerSize();
  const [ref, control] = useControlSize();
  const drop = useFileDrop(addAndShow);
  const role = useUser().role;
  const draft = selected?.draft ?? null;
  const pill = useRef<HTMLDivElement>(null);
  const [reserve, setReserve] = useState(0);

  /**
   * The pill is fixed to the bottom right of the window, so it covers whatever the
   * strip has under that corner. Keeping its width as room at the end of the strip
   * means the tiles scroll clear of it instead of disappearing behind it - the `+`
   * in particular still has to be visible and clickable.
   */
  useLayoutEffect(() => {
    if (!gallery.dirty) {
      setReserve(0);
      return;
    }
    setReserve((pill.current?.offsetWidth ?? 0) + 8);
  }, [gallery.dirty, gallery.saving]);

  function addAndShow(files: File[]) {
    const added = gallery.add(files);
    if (added.length > 0) setSelected(added[0]);
  }

  /**
   * Drafts only exist in memory, so leaving the page loses them - but so does
   * selecting a thumbnail, which writes the `selected-image` search param and is a
   * navigation of its own. Only a different pathname is worth asking about.
   */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      gallery.dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  async function saveAndLeave() {
    await gallery.save();
  }

  function discardAndLeave() {
    gallery.discardAll();
  }

  /**
   * Once there is nothing left to lose - saved from the dialog or from the pill,
   * or discarded - the navigation the user already started can finish. Doing it
   * here rather than in the handlers keeps `proceed` from being called twice, which
   * the router rejects.
   */
  useEffect(() => {
    if (blocker.state === "blocked" && !gallery.dirty) blocker.proceed?.();
  }, [blocker, gallery.dirty]);

  return (
    <div ref={refContainer} className="flex flex-col gap-1 flex-1 w-full min-h-0">
      <div className="flex-1 min-h-0 justify-center  items-center flex">
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
          className="relative flex-1 min-h-0  flex justify-center items-center overflow-hidden"
        >
          <img className="max-w-full max-h-full object-contain" src={selected?.href} />
          {draft !== null ? (
            <DiscardDraft onDiscard={() => gallery.discard(draft)} />
          ) : selected !== null && role === "admin" ? (
            <DeleteImg selected={selected} />
          ) : null}
        </div>
        <Button
          className="h-full px-0"
          variant="secondary"
          disabled={index === gallery.items.length - 1}
          onClick={handleNext}
        >
          <ChevronRight />
        </Button>
      </div>
      <div ref={ref} className="flex flex-col w-full min-h-0">
        <Reorder.Group
          axis="x"
          values={gallery.items}
          onReorder={gallery.move}
          className={cn(
            "flex items-center gap-1 h-36 overflow-x-scroll overflow-y-hidden rounded-lg px-1",
            { "ring-2 ring-primary": drop.active },
          )}
          {...drop.handlers}
        >
          {gallery.items.map((item) => (
            <Thumb
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => setSelected(item.id)}
            />
          ))}
          <AddTile onFiles={addAndShow} disabled={gallery.saving} />
          {/* not an image: room for the floating pill, which sits over this corner */}
          {reserve > 0 ? <li aria-hidden className="shrink-0" style={{ width: reserve }} /> : null}
        </Reorder.Group>
      </div>
      {gallery.dirty ? (
        <div
          ref={pill}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-lg"
        >
          <span className="text-normal text-destructive">Belum disimpan</span>
          <Button onClick={() => void gallery.save()} disabled={gallery.saving}>
            Simpan <Spinner when={gallery.saving} />
          </Button>
          <Button variant="ghost" onClick={gallery.discardAll} disabled={gallery.saving}>
            Batal
          </Button>
        </div>
      ) : null}
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-normal">Gambar belum disimpan</DialogTitle>
            <DialogDescription className="text-small">
              {gallery.drafts.length} gambar belum disimpan. Simpan dulu sebelum pindah?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between gap-2 mt-5">
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              Batal
            </Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={discardAndLeave}
                disabled={gallery.saving}
              >
                Buang
              </Button>
              <Button onClick={() => void saveAndLeave()}>
                Simpan <Spinner when={gallery.saving} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
