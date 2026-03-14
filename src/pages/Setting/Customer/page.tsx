import { TextError } from "~/components/TextError";
import { Item } from "./z-Item";
import { NewCustomer } from "./z-NewCustomer";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { useGetCustomers } from "~/hooks/use-get-customer";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Pelanggan</h2>
      <Customer />
      <NewCustomer />
    </div>
  );
}

function Customer() {
  const res = useGetCustomers();
  return Result.match(res, {
    onLoading() {
      return <LoadingList />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(customers) {
      return (
        <>
          {customers.map((customer) => (
            <Item key={customer.id} customer={customer} />
          ))}
        </>
      );
    },
  });
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center px-0.5 gap-1">
          <div className="grid grid-cols-[1fr_1fr_35px] items-center gap-3 w-full">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-10 justify-self-end" />
          </div>
          <Skeleton className="h-4 w-48 self-start" />
        </div>
      ))}
    </div>
  );
}
