import { useLoaderData } from "react-router";
import { TextError } from "~/components/TextError";
import { Loader } from "./loader";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { Loading } from "~/components/Loading";
import { Item } from "./Item";
import { NewCustomer } from "./NewCustomer";
import { Customer as CustomerDB } from "~/database/customer/get-all";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";

export default function Page() {
  const customers = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Pelanggan</h2>
      <Suspense fallback={<Loading></Loading>}>
        <Customer customers={customers} />
      </Suspense>
      <NewCustomer />
    </div>
  );
}

function Customer({
  customers: promise,
}: {
  customers: Promise<Result<"Aplikasi bermasalah", CustomerDB[]>>;
}) {
  const [errMsg, customers] = use(promise);
  const error = useAction<Action>()("edit");
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return (
    <>
      {customers.map((customer) => (
        <Item key={customer.id} customer={customer} />
      ))}
      <TextError>{error}</TextError>
    </>
  );
}
