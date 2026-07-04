import { Context, Effect } from "effect";
import { Customer } from "./type";
import { CustomerError } from "./error";
export { CustomerError } from "./error";

export class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    loader(): Effect.Effect<void, CustomerError>;
    useCustomers(): Customer[];
    add(name: string, phone: string): Effect.Effect<void, CustomerError>;
    set(id: string, name: string, phone: string): Effect.Effect<void, CustomerError>;
    delete(id: string): Effect.Effect<void, CustomerError>;
  }
>() {}
