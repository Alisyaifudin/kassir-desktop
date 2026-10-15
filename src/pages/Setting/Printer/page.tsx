import { TestBtn } from "./z-TestBtn";
import { Settings } from "./z-Settings";

export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Pengaturan Printer</h1>
        <p className="text-muted-foreground text-normal">Konfigurasi printer untuk cetak struk</p>
      </div>
      <Settings />
      <TestBtn />
    </div>
  );
}
