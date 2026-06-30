import { Context, Effect } from "effect";
import { AsyncDataState, Status } from "~/lib/state";
import { Customer } from "./type";
import { CustomerError } from "./error";

export class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    useLoad(): Status<CustomerError>;
    customers: AsyncDataState<Customer[], string>;
    add(name: string, phone: string): Effect.Effect<void, CustomerError>;
    update(id: string, name: string, phone: string): Effect.Effect<void, CustomerError>;
    delete(id: string): Effect.Effect<void, CustomerError>;
  }
>() {}
