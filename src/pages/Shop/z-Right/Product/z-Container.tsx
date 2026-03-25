import { cn } from "~/lib/utils";
import { DetailDialog } from "../DetailDialog";
import { Show } from "~/components/Show";
import { memo } from "react";
import { useSelector } from "@xstate/store/react";
import { productsStore } from "../../store/product";
import { Move } from "./z-Move";

type Props = {
  id: string;
  index: number;
};

export const Container = memo(function Container({
  index,
  children,
  id,
}: Props & {
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div
        className={cn(
          "flex gap-4 rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30 group",
          {
            "bg-muted/10": index % 2 === 0,
          },
        )}
      >
        <div className="flex-none flex flex-col items-center justify-start pt-1">
          <Wrapper id={id} index={index} />
        </div>
        <div className="min-w-0 flex-1 pr-1 py-1">{children}</div>
      </div>
    </div>
  );
});
const Wrapper = memo(function Wrapper({ index, id }: Props) {
  const product = useSelector(
    productsStore,
    (state) => state.context.find((c) => c.id === id)?.product,
  );
  return (
    <div className="flex flex-col items-center gap-2">
      <Show
        value={product}
        fallback={
          <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-small font-bold text-muted-foreground">
            {index + 1}
          </div>
        }
      >
        {(product) => (
          <DetailDialog index={index} product={product} />
        )}
      </Show>
      <Move id={id} index={index} />
    </div>
  );
});
