import { RefreshCcw } from "lucide-react";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { db } from "~/database/db";

export function Refresh() {
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
      <RefreshCcw className="small:w-5 small:h-5 w-6 h-6" />
    </Button>
  );
}
