import { useLoaderData } from "react-router";
import { TextError } from "~/components/TextError";
import { Loader } from "./loader";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { Loading } from "~/components/Loading";
import { Item } from "./Item";
import { NewCustomer } from "./NewCustomer";
import { Size } from "~/lib/store-old";

export default function Page() {
  const { customers, size } = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Pelanggan</h2>
      <Suspense fallback={<Loading></Loading>}>
        <Customer customers={customers} size={size} />
      </Suspense>
      <NewCustomer size={size} />
    </div>
  );
}

function Customer({
  customers: promise,
  size,
}: {
  customers: Promise<Result<"Aplikasi bermasalah", DB.Customer[]>>;
  size: Size;
}) {
  const [errMsg, customers] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return (
    <>
      {customers.map((customer) => (
        <Item size={size} key={customer.name} customer={customer} />
      ))}
    </>
  );
}
