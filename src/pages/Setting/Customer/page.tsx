import { TextError } from "~/components/TextError";
import { LoadingFull } from "~/components/Loading";
import { Item } from "./z-Item";
import { NewCustomer } from "./z-NewCustomer";
import { Result } from "~/lib/result";
import { useGetCustomers } from "./use-get-customer";
import { log } from "~/lib/log";

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
      return <LoadingFull />;
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
