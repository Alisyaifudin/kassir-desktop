import { RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useSize } from "~/hooks/use-size";

const iconSize = {
  big: 24,
  small: 20,
};

export function Refresh() {
  const size = useSize();
  return (
    <Button
      size="icon"
      className="rounded-full h-10 w-10 small:h-8 small:w-8 hover:bg-sky-400/50"
      onClick={() => window.location.reload()}
      variant="ghost"
    >
      <RefreshCcw size={iconSize[size]} />
    </Button>
  );
}
