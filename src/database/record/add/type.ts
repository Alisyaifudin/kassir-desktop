import { Product as ProductTx } from "~/transaction/product/get-by-tab";
import { Extra as ExtraTx } from "~/transaction/extra/get-by-tab";

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace RecordType {
  type Discount = {
    value: number;
    eff: number;
    subtotal: number;
    kind: TX.DiscKind;
    id: string;
  };
  type Product = Omit<ProductTx, "discounts"> & {
    discounts: Discount[];
    total: number;
    error?: string;
  };
  type ProductFull = Product & {
    capitalRaw: number;
    capital: number;
  };
  type Extra = ExtraTx & {
    eff: number;
    base: number;
    subtotal: number;
  };
  type Record = {
    isCredit: boolean;
    cashier: string;
    mode: DB.Mode;
    pay: number;
    rounding: number;
    note: string;
    methodId: string;
    fix: number;
    customer: {
      name: string;
      phone: string;
      id?: string;
    };
    subtotal: number;
    total: number;
    grandTotal: number;
    products: Product[];
    extras: Extra[];
  };
}
