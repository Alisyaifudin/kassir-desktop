import { cn } from "~/lib/utils";
import { DetailDialog } from "../DetailDialog";
import { Show } from "~/components/Show";
import { memo } from "react";
import { Product } from "../../store/product";
// import { Move } from "./z-Move";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

type Props = {
  product: Product;
  index: number;
};

export const Container = memo(function Container({
  index,
  children,
  product,
}: Props & {
  children: React.ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={product} dragListener={false} dragControls={controls} className="py-1">
      <div
        className={cn(
          "flex gap-4  rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30 group",
          {
            "bg-muted/10": index % 2 === 0,
          },
        )}
      >
        <div className="flex-none flex flex-col items-center justify-start pt-1">
          <div className="flex flex-col items-center gap-2">
            <Show
              value={product.product}
              fallback={
                <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-small font-bold text-muted-foreground">
                  {index + 1}
                </div>
              }
            >
              {(product) => <DetailDialog index={index} product={product} />}
            </Show>
            {/* <Move id={id} index={index} /> */}
          </div>
          <div className="flex flex-1 items-center">
            <div className="hover:cursor-grab" onPointerDown={(e) => controls.start(e)}>
              <GripVertical />
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 pr-1 py-1">{children}</div>
      </div>
    </Reorder.Item>
  );
});

// const Wrapper = memo(function Wrapper({ index, id }: Props) {
//   const product = useSelector(
//     productsStore,
//     (state) => state.context.find((c) => c.id === id)?.product,
//   );
//   return (
//     <div className="flex flex-col items-center gap-2">
//       <Show
//         value={product}
//         fallback={
//           <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-small font-bold text-muted-foreground">
//             {index + 1}
//           </div>
//         }
//       >
//         {(product) => <DetailDialog index={index} product={product} />}
//       </Show>

//       <div className="reorder-handle" onPointerDown={(e) => controls.start(e)} />
//       {/* <Move id={id} index={index} /> */}
//     </div>
//   );
// });
