import { cn } from "~/lib/utils";
import { DetailDialog } from "../DetailDialog";
import { css } from "../style.css";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { memo } from "react";
import { useSelector } from "@xstate/store/react";
import { productsStore } from "./use-products";

type Props = {
  id: string;
  index: number;
};

export const Container = memo(
  ({
    index,
    children,
    id,
  }: Props & {
    children: React.ReactNode;
  }) => {
    const size = useSize();
    return (
      <div
        className={cn("grid items-center py-0.5", css.item[size].topLevel, {
          "bg-muted": index % 2 == 0,
        })}
      >
        <Wrapper id={id} index={index} />
        {children}
      </div>
    );
  },
);
const Wrapper = memo(({ index, id }: Props) => {
  const size = useSize();
  const { name, stock, product } = useSelector(
    productsStore,
    (state) => state.context.find((c) => c.id === id)!,
  );
  return (
    <div className="flex justify-center items-center">
      <Show value={product?.id} fallback={<p className="text-center">{index + 1}</p>}>
        {(productId) => (
          <DetailDialog index={index} size={size} productId={productId} stock={stock} name={name} />
        )}
      </Show>
    </div>
  );
});
