import { useNavigate } from "react-router";

export function ErrorComponent({
  status,
  children,
  title = "Ada Kendala",
}: {
  status?: number;
  children: React.ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-4">
        {status && <h1 className="text-6xl font-bold text-gray-400">{status}</h1>}

        <h2 className="text-2xl font-semibold">{title}</h2>

        <p className="text-gray-600">{children}</p>

        <div className="flex gap-3 justify-center pt-4">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded border">
            Kembali
          </button>

          <button
            onClick={() => navigate("/", { replace: true })}
            className="px-4 py-2 rounded bg-black text-white"
          >
            Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
