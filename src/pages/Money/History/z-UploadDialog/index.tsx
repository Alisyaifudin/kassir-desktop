import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Content } from "./z-Content";

const moneySchemaFormat = `{
  value: number;
  note: string;
  timestamp: number;
}[]`;

export function UploadMoney({ kindId }: { kindId: string }) {
  return (
    <Dialog>
      <Button asChild variant="secondary">
        <DialogTrigger>Unggah</DialogTrigger>
      </Button>
      <DialogContent className="flex  overflow-y-auto max-h-[calc(100vh-2rem)] max-w-2xl flex-col p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-6 pr-14">
          <DialogTitle>Unggah data keuangan</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="text-small!">File JSON harus mengikuti bentuk data berikut:</p>
              <pre className="overflow-x-auto rounded-md border border-input bg-muted/50 p-4 text-sm text-foreground">
                <code>{moneySchemaFormat}</code>
              </pre>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 px-6 pb-6">
          <Content kindId={kindId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
