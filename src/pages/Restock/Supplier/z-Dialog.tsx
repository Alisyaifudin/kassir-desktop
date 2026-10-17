import { User } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Existing } from "./z-Existing";
import { New } from "./z-New";

/**
 * Who the goods were bought from. Same two-pane shape as the sale screen's
 * customer picker — find an existing one, or add a new one — but a supplier is
 * a name plus a note, so the search pane reads differently.
 */
export function SupplierDialog() {
  return (
    <Dialog>
      <Button className="rounded-full p-1 z-10" asChild variant="secondary">
        <DialogTrigger type="button" title="Pemasok">
          <User className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="min-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-big">Pemasok</DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue="cari"
          className="flex h-[320px] max-h-full w-full flex-col items-start gap-2 overflow-hidden"
        >
          <TabsList>
            <TabsTrigger value="cari">Cari</TabsTrigger>
            <TabsTrigger value="baru">Baru</TabsTrigger>
          </TabsList>
          <TabsContent
            value="cari"
            className="flex w-full min-h-0 grow shrink basis-0 flex-col overflow-hidden px-1"
          >
            <Existing />
          </TabsContent>
          <TabsContent
            value="baru"
            className="flex w-full min-h-0 grow shrink basis-0 flex-col overflow-hidden px-1"
          >
            <New />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
