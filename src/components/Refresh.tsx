import { RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useSize } from "~/hooks/use-size";

const liHeight = {
  big: {
    height: "48px",
  },
  small: {
    height: "40px",
  },
};

export function Refresh() {
  const size = useSize();
  return (
    <li style={liHeight[size]}>
      <Button
        size="icon"
        className="rounded-full"
        onClick={() => window.location.reload()}
        variant="ghost"
      >
        <RefreshCcw />
      </Button>
    </li>
  );
}
