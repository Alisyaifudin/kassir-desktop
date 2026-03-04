import { RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useSize } from "~/hooks/use-size";

const iconSize = {
  big: 30,
  small: 20,
};

export function Refresh() {
  const size = useSize();
  return (
    <li className="h-[60px] flex items-center small:h-[35px]">
      <Button
        size="icon"
        className="rounded-full"
        onClick={() => window.location.reload()}
        variant="ghost"
      >
        <RefreshCcw size={iconSize[size]} />
      </Button>
    </li>
  );
}
