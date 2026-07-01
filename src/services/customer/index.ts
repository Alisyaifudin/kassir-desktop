import { Context } from "effect";
import { Customer } from "./type";
import { CustomerError } from "./error";

export class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    loader(): Promise<CustomerError | null>;
    useCustomers(): Customer[];
    add(name: string, phone: string): Promise<string | null>;
    set(id: string, name: string, phone: string): Promise<string | null>;
    delete(id: string): Promise<string | null>;
  }
>() {}
