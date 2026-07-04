import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { CustomerService } from "~/services/customer";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { CustomerList } from "./z-CustomerList";
import { NewCustomer } from "./z-NewCustomer";
import { promisify } from "~/lib/promisify";

const page = Effect.gen(function* () {
  const customerService = yield* CustomerService;
  const onAdd = (name: string, phone: string) =>
    promisify(
      () => customerService.add(name, phone),
      (e) => e.e.message,
    );
  const onDelete = (id: string) =>
    promisify(
      () => customerService.delete(id),
      (e) => e.e.message,
    );
  const onUpdate = (id: string, name: string, phone: string) =>
    promisify(
      () => customerService.set(id, name, phone),
      (e) => e.e.message,
    );

  return function Page() {
    return (
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Daftar Pelanggan</h1>
          <p className="text-muted-foreground text-normal">Kelola informasi pelanggan dan kontak</p>
        </div>
        <StateWrap
          loader={customerService.loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <CustomerList
            onDelete={onDelete}
            onUpdate={onUpdate}
            useCustomers={customerService.useCustomers}
          />
          <NewCustomer onAdd={onAdd} />
        </StateWrap>
      </div>
    );
  };
});

export default page;
