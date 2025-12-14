import { cn } from "~/lib/utils";
import { DetailDialog } from "../DetailDialog";
import { css } from "../style.css";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { memo } from "react";

type Props = {
  stock: number;
  name: string;
  productId?: number;
  index: number;
};

export function Container({
  index,
  children,
  ...props
}: Props & {
  children: React.ReactNode;
}) {
  const size = useSize();
  return (
    <div
      className={cn("grid items-center py-0.5", css.item[size].topLevel, {
        "bg-muted": index % 2 == 0,
      })}
    >
      <Wrapper {...props} index={index} />
      {children}
    </div>
  );
}
const Wrapper = memo(({ index, name, stock, productId }: Props) => {
  const size = useSize();
  return (
    <div className="flex justify-center items-center">
      <Show value={productId} fallback={<p className="text-center">{index + 1}</p>}>
        {(productId) => (
          <DetailDialog index={index} size={size} productId={productId} stock={stock} name={name} />
        )}
      </Show>
    </div>
  );
});
