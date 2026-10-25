import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import { pageData } from "./data";
import { Item } from "./z-Item";
import { NewCustomer } from "./z-NewCustomer";

/**
 * The title, the description and the add button are static; only the rows wait.
 * A failed read replaces the rows with a line, not the page.
 */
export default function Page() {
  return (
    <pageData.Provider sources={{ customers: service.customer.get.changes }}>
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Daftar Pelanggan</h1>
          <p className="text-muted-foreground text-normal">Kelola informasi pelanggan dan kontak</p>
        </div>
        <Customers />
        <NewCustomer />
      </div>
    </pageData.Provider>
  );
}

function Customers() {
  return (
    <pageData.Gate
      keys={["customers"]}
      pulse={<LoadingList />}
      error={(error) => <TextError>{`Daftar pelanggan bermasalah: ${error.message}`}</TextError>}
    >
      {({ customers }) => (
        <>
          {customers.map((customer) => (
            <Item key={customer.id} customer={customer} />
          ))}
        </>
      )}
    </pageData.Gate>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat pelanggan">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center p-3 gap-2 rounded-xl bg-muted/30">
          <div className="grid grid-cols-[1fr_1fr_35px] items-center gap-3 w-full">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full justify-self-end" />
          </div>
          <Skeleton className="h-3 w-48 self-start rounded" />
        </div>
      ))}
    </div>
  );
}
