import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { ImageDialog } from "./z-ImageDialog";
import { ImageResult } from "./use-data";
import { revalidate } from "./use-data";

type Props = {
  images: ImageResult[];
  selected: ImageResult | null;
  productId: string;
  onAdd: (productId: string, file: File) => Promise<string | null>;
  onSwap: (a: string, b: string) => Promise<string | null>;
};

export function ImageControl({ images, selected, productId, onAdd, onSwap }: Props) {
  const prev = getPrevId(images, selected);
  const next = getNextId(images, selected);

  return (
    <div className="flex gap-2 w-full justify-between">
      <SwapBtn
        dir="left"
        current={selected?.id}
        target={prev}
        onSwap={onSwap}
      />
      <ImageDialog productId={productId} onAdd={onAdd} />
      <SwapBtn
        dir="right"
        current={selected?.id}
        target={next}
        onSwap={onSwap}
      />
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────

function getPrevId(images: ImageResult[], selected: ImageResult | null) {
  if (selected === null) return undefined;
  const prevs = images.filter((img) => img.order < selected.order);
  if (prevs.length === 0) return undefined;
  return prevs.reduce((a, b) => (a.order > b.order ? a : b)).id;
}

function getNextId(images: ImageResult[], selected: ImageResult | null) {
  if (selected === null) return undefined;
  const nexts = images.filter((img) => img.order > selected.order);
  if (nexts.length === 0) return undefined;
  return nexts.reduce((a, b) => (a.order < b.order ? a : b)).id;
}

// ── Swap button ─────────────────────────────────────────────────

function SwapBtn({
  dir,
  current,
  target,
  onSwap,
}: {
  dir: "left" | "right";
  current?: string;
  target?: string;
  onSwap: (a: string, b: string) => Promise<string | null>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSwap() {
    if (target === undefined || current === undefined) return;
    setLoading(true);
    const err = await onSwap(current, target);
    setLoading(false);
    if (err !== null) {
      toast.error(err);
    } else {
      revalidate();
    }
  }

  const isLeft = dir === "left";

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handleSwap}
        variant="ghost"
        className="flex text-small! items-center"
        disabled={current === undefined || target === undefined}
      >
        {isLeft && <ChevronLeft className="icon" />}
        {isLeft ? "Pindahkan Kiri" : "Pindahkan Kanan"}
        {!isLeft && <ChevronRight className="icon" />}
      </Button>
      <Spinner when={loading} />
    </div>
  );
}
