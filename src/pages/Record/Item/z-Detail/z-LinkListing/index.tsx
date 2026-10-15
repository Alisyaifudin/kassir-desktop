import { ExternalLink, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import type { RecordListing } from "~/services/record";
import { Catalog } from "./z-Catalog";

/** Link this historical line to a precise catalog listing, or unlink it. */
export function LinkListing({ listing }: { listing: RecordListing }) {
  return (
    <Dialog>
      <Button variant="ghost" size="icon" asChild title="Hubungkan ke listing">
        <DialogTrigger>
          {listing.listingId !== null ? <Lock className="icon" /> : <ExternalLink className="icon" />}
        </DialogTrigger>
      </Button>
      <DialogContent className="left-5 top-5 bottom-5 right-5 w-[calc(100%-40px)] max-w-full translate-0 flex flex-col gap-3">
        <Catalog listing={listing} />
      </DialogContent>
    </Dialog>
  );
}
