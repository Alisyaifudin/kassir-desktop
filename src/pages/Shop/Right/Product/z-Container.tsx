import { cn } from "~/lib/utils";
import { DetailDialog } from "../DetailDialog";
import { Show } from "~/components/Show";
import { memo } from "react";
import { useSelector } from "@xstate/store/react";
import { productsStore } from "../../store/product";

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
    <div
      className={cn("grid items-center py-0.5 grid-cols-[70px_1fr] small:grid-cols-[40px_1fr]", {
        "bg-muted": index % 2 == 0,
      })}
    >
      <Wrapper id={id} index={index} />
      {children}
    </div>
  );
});
const Wrapper = memo(function Wrapper({ index, id }: Props) {
  const { name, stock, product } = useSelector(
    productsStore,
    (state) => state.context.find((c) => c.id === id)!,
  );
  return (
    <div className="flex justify-center items-center">
      <Show value={product?.id} fallback={<p className="text-center">{index + 1}</p>}>
        {(productId) => (
          <DetailDialog index={index} productId={productId} stock={stock} name={name} />
        )}
      </Show>
    </div>
  );
});
