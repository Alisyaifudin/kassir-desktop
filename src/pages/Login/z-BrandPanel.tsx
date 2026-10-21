import { ReceiptText, ScanLine, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { version } from "~/lib/constants";

const features = [
  { icon: ScanLine, text: "Transaksi cepat dan akurat" },
  { icon: TrendingUp, text: "Pantau penjualan secara real-time" },
  { icon: Wallet, text: "Kelola kas, utang, dan stok" },
];

/** Decorative marketing panel shown on wide screens next to the auth card. */
export function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-12 text-white small:p-8 lg:flex lg:w-[45%] xl:w-1/2">
      <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-cyan-300/30 blur-3xl small:size-72" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-indigo-400/40 blur-3xl small:size-80" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

      <div className="relative flex items-center gap-3 small:gap-2">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur small:size-12">
          <ReceiptText className="size-8 small:size-6" />
        </div>
        <span className="text-big font-bold tracking-tight">Kassir</span>
      </div>

      <div className="relative flex flex-col gap-6 small:gap-4">
        <h1 className="max-w-lg text-5xl font-bold leading-[1.1] tracking-tight small:text-4xl">
          Kelola toko Anda dengan lebih mudah.
        </h1>
        <p className="max-w-md text-normal text-white/80">
          Semua yang Anda butuhkan untuk menjalankan bisnis — dari transaksi hingga laporan.
        </p>
        <ul className="mt-2 flex flex-col gap-3 small:mt-1 small:gap-2">
          {features.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 text-small text-white/90 small:gap-2"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 small:size-8">
                <Icon className="size-5 small:size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-2 text-white/60 small:gap-1">
        <ShieldCheck className="size-4 small:size-3.5" />
        <span className="text-tiny">Data tersimpan aman di perangkat Anda</span>
        <span className="ml-auto text-tiny">v{version}</span>
      </div>
    </aside>
  );
}
