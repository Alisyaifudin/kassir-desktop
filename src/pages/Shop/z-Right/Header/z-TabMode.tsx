import { Button } from "~/components/ui/button";
import { useMode } from "./use-mode";
import { ChevronLeft, ChevronRight } from "lucide-react";

const label = {
  product: "Tambahan",
  extra: "Produk",
};

export function TabMode() {
  const [mode, setMode] = useMode();
  return (
    <div className="p-1">
      <Button onClick={() => setMode(mode === "extra" ? "product" : "extra")}>
        {mode === "product" ? <ChevronRight /> : <ChevronLeft />}
        {label[mode]}
      </Button>
    </div>
  );
}
