import { Extra } from "~/database/extra/cache";

export function Info({ extra }: { extra: Extra }) {
  return (
    <div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
      <h1 className="font-bold text-big col-span-2">Info biaya lainnya</h1>
      <span>Nama</span>
      <span>{extra.name}</span>
      <span>Jenis</span>
      <span>{extra.kind}</span>
      <span>Nilai</span>
      <span>{extra.value}</span>
    </div>
  );
}
