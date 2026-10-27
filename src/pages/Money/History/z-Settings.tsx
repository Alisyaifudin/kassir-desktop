import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import type { Pocket } from "~/services/money";
import { DeletePocketBtn } from "./z-DeletePocket";
import { Download } from "./z-Download";
import { UploadMoney } from "./z-UploadDialog";

/**
 * Upload, download and delete used to sit in a footer under the ledger, where
 * they stole a row from the table for actions that are rare next to reading the
 * ledger. They live behind one header button now.
 */
export function PocketSettings({ pocket }: { pocket: Pocket }) {
  return (
    <Dialog>
      <Button
        asChild
        size="icon"
        variant="secondary"
        className="size-12 rounded-full"
      >
        <DialogTrigger aria-label="Pengaturan kantong" title="Pengaturan kantong">
          <SlidersHorizontal className="size-5" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Pengaturan Kantong</DialogTitle>
          <DialogDescription>
            Unggah, unduh, atau hapus kantong &ldquo;{pocket.name}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        {/* The action dialogs portal their own content, so `w-full` here only
            reaches the three triggers. */}
        <div className="flex flex-col gap-2 [&_button]:w-full">
          <UploadMoney pocketId={pocket.id} />
          <Download pocket={pocket} />
          <Separator className="my-1" />
          <DeletePocketBtn pocketId={pocket.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
