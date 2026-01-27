import { TextError } from "~/components/TextError";
import { log } from "~/lib/utils";
import { Suspense } from "react";
import { Loading } from "~/components/Loading";
import { Item } from "./z-Item";
import { NewCustomer } from "./z-NewCustomer";
import { useMicro } from "~/hooks/use-micro";
import { KEY, loader } from "./loader";
import { Either } from "effect";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Pelanggan</h2>
      <Suspense fallback={<Loading></Loading>}>
        <Customer />
      </Suspense>
      <NewCustomer />
    </div>
  );
}

function Customer() {
  const res = useMicro({
    fn: () => loader(),
    key: KEY,
  });
  return Either.match(res, {
    onLeft({ e }) {
      log.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight(customers) {
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
