import { KIND_LABEL } from "../util-extra-options";
import type { Extra } from "~/services/extra";

export function Info({ extra }: { extra: Extra }) {
  return (
    <div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
      <h1 className="font-bold text-2xl col-span-2">Info biaya lainnya</h1>
      <span>Nama</span>
      <span>{extra.name}</span>
      <span>Jenis</span>
      <span>{KIND_LABEL[extra.kind]}</span>
      <span>Nilai</span>
      <span>{extra.value.toLocaleString("id-ID")}</span>
    </div>
  );
}
