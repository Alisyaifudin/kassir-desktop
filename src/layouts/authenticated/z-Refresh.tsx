import { RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";

export function Refresh() {
  return (
    <Button
      size="icon"
      className="rounded-full h-10 w-10 small:h-8 small:w-8 hover:bg-sky-400/50"
      onClick={() => window.location.reload()}
      variant="ghost"
    >
      <RefreshCcw className="size-6 small:size-5" />
    </Button>
  );
}
