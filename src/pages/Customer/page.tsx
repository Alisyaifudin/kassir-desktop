import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { CustomerService } from "~/services/customer";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { customerListEffect } from "./effect-customerList";
import { newCustomerEffect } from "./effect-newCustomer";

const page = Effect.gen(function* () {
  const customerService = yield* CustomerService;
  const loader = () => customerService.loader();
  const CustomerList = yield* customerListEffect;
  const NewCustomer = yield* newCustomerEffect;
  return function Page() {
    return (
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Daftar Pelanggan</h1>
          <p className="text-muted-foreground text-normal">Kelola informasi pelanggan dan kontak</p>
        </div>
        <StateWrap
          loader={loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <CustomerList />
          <NewCustomer />
        </StateWrap>
      </div>
    );
  };
});

export default page;
