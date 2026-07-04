import { Effect } from "effect";
import { ProductDownload } from "./z-ProductDownload";
import { RecordDownload } from "./z-RecordDownload";
import { productUpload } from "./ProductUpload";
import { recordUpload } from "./RecordUpload";
import { ProductService } from "~/services/product";
import { RecordService } from "~/services/record";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";

const page = Effect.gen(function* () {
  const productService = yield* ProductService;
  const recordService = yield* RecordService;
  const ioService = yield* IoService;
  const blobService = yield* BlobService;
  const ProductUpload = yield* productUpload;
  const RecordUpload = yield* recordUpload;

  const onDownloadProduct = () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const products = yield* productService.get.all();
        const data = yield* blobService.convert.fromObject(products);
        const name = `${Date.now()}-products.json`;
        const filePath = yield* ioService.dialog({
          title: "Simpan Data Produk",
          defaultPath: name,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        yield* ioService.save(filePath, data);
        return null;
      }).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message))),
    );

  const onDownloadRecord = (start: number, end: number) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const records = yield* recordService.get.range(start, end);
        const data = yield* blobService.convert.fromObject(records);
        const name = `record_${start}_${end}.json`;
        const filePath = yield* ioService.dialog({
          title: "Simpan Data Riwayat",
          defaultPath: name,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        yield* ioService.save(filePath, data);
        return null;
      }).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message))),
    );

  return function Page() {
    return (
      <div className="flex flex-col gap-6 p-6 flex-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Kelola Data</h1>
          <p className="text-muted-foreground text-normal">Unduh dan unggah data aplikasi</p>
        </div>

        <section
          aria-labelledby="download-title"
          className="rounded-2xl border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1 mb-4">
            <h2 id="download-title" className="font-bold text-big text-foreground">
              Unduh Data
            </h2>
            <p className="text-muted-foreground text-normal">Ekspor data produk dan transaksi</p>
          </div>
          <ProductDownload onDownload={onDownloadProduct} />
          <RecordDownload onDownload={onDownloadRecord} />
        </section>

        <section
          aria-labelledby="upload-title"
          className="rounded-2xl space-y-6 border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1 mb-4">
            <h2 className="font-bold text-big text-foreground" id="upload-title">
              Unggah Data
            </h2>
            <p className="text-muted-foreground text-normal">Impor data ke sistem</p>
          </div>
          <ProductUpload />
          <RecordUpload />
        </section>
      </div>
    );
  };
});

export default page;
