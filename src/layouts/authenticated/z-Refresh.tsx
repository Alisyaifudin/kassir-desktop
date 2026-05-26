import { RefreshCcw } from "lucide-react";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { db } from "~/database";
import { useSize } from "~/hooks/use-size";

const iconSize = {
  big: 24,
  small: 20,
};

export function Refresh() {
  const size = useSize();
  const refresh = useCallback(() => {
    db.customer.revalidate();
    db.extra.revalidate();
    db.image.revalidate();
    db.method.revalidate();
    db.product.revalidate();
    db.social.revalidate();
    window.location.reload();
  }, []);
  return (
    <Button
      size="icon"
      className="rounded-full h-10 w-10 small:h-8 small:w-8 hover:bg-sky-400/50"
      onClick={refresh}
      variant="ghost"
    >
      <RefreshCcw size={iconSize[size]} />
    </Button>
  );
}
