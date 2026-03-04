import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { User } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn, logOld } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { useMicro } from "~/hooks/use-micro";
import { loader, KEY } from "~/pages/setting/customer/loader";
import { Either } from "effect";
import { TabBtn } from "./z-TabBtn";
import { AutoCustomer } from "./z-AutoCustomer";
import { NewCustomer } from "./z-NewCustomer";

export function CustomerDialog() {
  const res = useMicro({
    fn: () => loader(),
    key: KEY,
  });
  const [tab, setTab] = useState<"auto" | "man">("auto");
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight(customers) {
      return (
        <Dialog>
          <Button className="p-1 rounded-full" asChild variant="secondary">
            <DialogTrigger type="button">
              <User className="icon" />
            </DialogTrigger>
          </Button>
          <DialogContent className={cn("min-w-2xl")}>
            <DialogHeader>
              <DialogTitle className="text-big">Pelanggan</DialogTitle>
            </DialogHeader>
            <Tabs
              value={tab}
              className="w-full grow shrink basis-0 max-h-full h-[300px] items-start flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between w-full">
                <TabsList>
                  <TabsTrigger onClick={() => setTab("auto")} value="auto">
                    Cari
                  </TabsTrigger>
                  <TabsTrigger onClick={() => setTab("man")} value="man">
                    Baru
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabBtn value="auto">
                <AutoCustomer customers={customers} />
              </TabBtn>
              <TabBtn value="man">
                <NewCustomer customers={customers} />
              </TabBtn>
            </Tabs>
          </DialogContent>
        </Dialog>
      );
    },
  });
}
