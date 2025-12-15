import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { User, X } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { cn, Result } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { customerStore } from "../../use-transaction";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction";
import { Customer as CustomerDB } from "~/database/customer/get-all";
import { useTab } from "../../use-tab";
import { useAtom } from "@xstate/store/react";

export function Customer({
  customers: promise,
}: {
  customers: Promise<Result<"Aplikasi bermasalah", CustomerDB[]>>;
}) {
  const [errMsg, customers] = use(promise);
  const customer = useAtom(customerStore)
  const [tab, setTab] = useState(customer.isNew ? "man" : "auto");
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
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
            <NewCustomer customers={customers} setTab={setTab} />
          </TabBtn>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <TabsContent
      value={value}
      className="flex overflow-hidden w-full flex-col px-1 gap-2 grow shrink basis-0"
    >
      {children}
    </TabsContent>
  );
}

function NewCustomer({
  customers,
  setTab,
}: {
  customers: CustomerDB[];
  setTab: (tab: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [tab] = useTab();
  const [form, setForm] = useState({
    phone: "",
    name: "",
  });
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.focus();
  }, []);
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = e.currentTarget;
    if (error !== "") return;
    if (customers.find((c) => c.phone === form.phone) !== undefined) {
      setError("Pelanggan sudah ada");
      return;
    }
    setError("");
    const customer = { name: form.name, phone: form.phone, isNew: true };
    customerStore.set(customer);
    queue.add(() => tx.transaction.update.customer(tab, customer));
    target.reset();
    setTab("auto");
  }
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[100px_1fr] items-center gap-2">
      <Label htmlFor="customer-name">Nama</Label>
      <Input
        aria-autocomplete="list"
        ref={ref}
        value={form.name}
        onChange={(e) => {
          const val = e.currentTarget.value;
          setForm((form) => ({ ...form, name: val }));
        }}
        id="customer-name"
      />
      <Label htmlFor="customer-hp">HP</Label>
      <Input
        aria-autocomplete="list"
        value={form.phone}
        onChange={(e) => {
          const val = e.currentTarget.value;
          setForm((form) => ({ ...form, phone: val }));
          setError("");
        }}
        id="customer-hp"
      />
      <TextError>{error}</TextError>
    </form>
  );
}

function AutoCustomer({ customers: all }: { customers: CustomerDB[] }) {
  const customer = useAtom(customerStore);
  const [tab] = useTab();
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.focus();
  }, []);
  let customers: CustomerDB[] = [];
  if (query.trim() !== "") {
    const q = query.toLowerCase().trim();
    customers = all.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }
  function handleSelect(name: string, phone: string) {
    return function () {
      const customer = { name, phone, isNew: false };
      setQuery("");
      customerStore.set(customer);
      queue.add(() => tx.transaction.update.customer(tab, customer));
    };
  }
  function handleUnselect() {
    const customer = { name: "", phone: "", isNew: false };
    customerStore.set(customer);
    queue.add(() => tx.transaction.update.customer(tab, customer));
  }
  return (
    <div className="flex flex-col gap-2 p-0.5 overflow-hidden">
      <Input
        ref={ref}
        placeholder="Nama atau hp"
        aria-autocomplete="list"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        type="search"
      />
      <Show when={!customer.isNew && customer.name.trim() !== "" && customer.phone.trim() !== ""}>
        <div className="flex gap-3 items-center justify-between">
          <div className="flex-1 flex items-center justify-between">
            <p className="text-3xl font-bold">{customer.name}</p>
            <p className="text-3xl font-bold">{customer.phone}</p>
          </div>
          <button type="button" onClick={handleUnselect}>
            <X size={35} />
          </button>
        </div>
      </Show>
      <ul className="flex flex-col gap-2 overflow-auto">
        <ForEach items={customers}>
          {(customer) => (
            <li className="flex w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSelect(customer.name, customer.phone)}
                className="flex items-center justify-between w-full h-10"
              >
                <p className="text-3xl font-normal">{customer.name}</p>
                <p className="text-3xl font-normal">{customer.phone}</p>
              </Button>
            </li>
          )}
        </ForEach>
      </ul>
    </div>
  );
}
