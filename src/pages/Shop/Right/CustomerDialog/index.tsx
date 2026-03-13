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
import { TextError } from "~/components/TextError";
import { TabBtn } from "./z-TabBtn";
import { AutoCustomer } from "./z-AutoCustomer";
import { NewCustomer } from "./z-NewCustomer";
import { useGetCustomers } from "~/hooks/use-get-customer";
import { Result } from "~/lib/result";
import { Loading } from "~/components/Loading";
import { log } from "~/lib/log";
import { Customer } from "~/database-effect/customer/get-all";

export function CustomerDialog() {
  const res = useGetCustomers();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(customers) {
      return <Wrapper customers={customers} />;
    },
  });
}

function Wrapper({ customers }: { customers: Customer[] }) {
  const [tab, setTab] = useState<"auto" | "man">("auto");
  return (
    <Dialog>
      <Button className="p-1 rounded-full z-10" asChild variant="secondary">
        <DialogTrigger type="button">
          <User className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="min-w-2xl">
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
}
