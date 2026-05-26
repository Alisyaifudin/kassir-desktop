import RecordDownload from "./RecordDownload";
import { ProductDownload } from "./ProductDownload";
import { RecordUpload } from "./RecordUpload";
import { PorductUpload } from "./ProductUpload";

export default function Page() {
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
        <ProductDownload />
        <RecordDownload />
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
        <PorductUpload />
        <RecordUpload />
      </section>
    </div>
  );
}
