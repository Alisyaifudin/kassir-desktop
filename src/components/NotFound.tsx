import { MoveLeft, Home, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Link, useNavigate } from "react-router";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 w-full flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative flex justify-center">
          <span className="text-[10rem] font-black text-zinc-200 dark:text-zinc-900 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <TriangleAlert size={64} className="text-zinc-400 dark:text-zinc-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Anda tersesat</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Halaman yang anda cari tidak ditemukan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            className="gap-2 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            onClick={() => navigate(-1)}
          >
            <MoveLeft size={18} />
            Kembali
          </Button>

          <Button
            className="gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            asChild
          >
            <Link to="/">
              <Home size={18} />
              Halaman Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
