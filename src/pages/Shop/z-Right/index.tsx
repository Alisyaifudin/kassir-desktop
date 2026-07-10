import { ProductList } from "./Product";
import { ExtraList } from "./Extra";
import { GrandTotal } from "./z-GrandTotal";
import { capitalize } from "~/lib/utils";
import { Customer } from "./z-Customer";
import { Note } from "../z-Left/Summary/z-Note";
import { CustomerDialog } from "./CustomerDialog";
import { Watermark } from "./z-Watermark";
import { Header } from "./Header";
import { useUser } from "~/hooks/use-user";
import { Precision } from "./z-Precision";

export function Right() {
  const username = useUser().name ?? "admin";
  return (
    <div className="border-r flex-1 flex flex-col m-1 overflow-hidden">
      <Header />
      <Watermark>
        <ExtraList />
        <ProductList />
      </Watermark>
      <div className="flex items-center justify-between border-t">
        <div className="flex items-center gap-3">
          <p className="px-2 text-end">Kasir: {capitalize(username)}</p>
          <Note />
          <CustomerDialog />
          <Customer />
        </div>
        <Precision />
      </div>
      <GrandTotal />
    </div>
  );
}
