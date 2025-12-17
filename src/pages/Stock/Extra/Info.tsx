import { Extra } from "~/database/extra/caches";

export function Info({ extra }: { extra: Extra }) {
  return (
    <div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
      <h1 className="font-bold text-big col-span-2">Info biaya lainnya</h1>
      <p>Nama</p>
      <p>{extra.name}</p>
      <p>Jenis</p>
      <p>{extra.kind}</p>
      <p>Nilai</p>
      <p>{extra.value}</p>
    </div>
  );
}
