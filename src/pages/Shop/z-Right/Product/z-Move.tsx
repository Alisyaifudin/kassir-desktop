import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { productsStore, useProductLength } from "../../store/product";

export function Move({ index, id }: { index: number; id: string }) {
  const length = useProductLength();
  function handleUp() {
    productsStore.trigger.moveUp({ id });
  }
  function handleDown() {
    productsStore.trigger.moveDown({ id });
  }
  // reverse button, because the products is in reverse order
  return (
    <>
      <Button
        onClick={handleDown}
        size="icon"
        disabled={index === length - 1}
        variant="ghost"
        className="rounded-full"
      >
        <ChevronUp />
      </Button>
      <Button
        onClick={handleUp}
        size="icon"
        variant="ghost"
        disabled={index === 0}
        className="rounded-full"
      >
        <ChevronDown />
      </Button>
    </>
  );
}
