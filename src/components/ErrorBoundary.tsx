import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "./ui/button";
import { Unauthenticated } from "~/lib/auth-effect";
import Redirect from "./Redirect";

export default function ErrorBoundary() {
  const env = import.meta.env.DEV;
  const error = useRouteError();
  if (!env) {
    return (
      <main className="flex flex-col gap-2">
        <p>Halaman bermasalah</p>
        <p>
          <button onClick={() => history.back()} className="underline cursor-pointer">
            Kembali
          </button>
        </p>
        <p>
          Kembali ke <a href="/">halaman utama</a>
        </p>
      </main>
    );
  }
  if (isRouteErrorResponse(error)) {
    return (
      <main className="flex flex-col gap-2 p-1">
        <Button className="w-fit" onClick={() => window.location.reload()}>
          Segarkan/<em>Refresh</em> Halaman
        </Button>
        <p>
          <button onClick={() => history.back()} className="underline cursor-pointer">
            Kembali
          </button>
        </p>
        <a href="/" className="underline">
          Kembali ke halaman utama
        </a>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </main>
    );
  } else if (error instanceof Error) {
    if (error instanceof Unauthenticated) {
      return <Redirect to="/login" />;
    }
    return (
      <main className="flex flex-col gap-2 p-1">
        <Button className="w-fit" onClick={() => window.location.reload()}>
          Segarkan/<em>Refresh</em> Halaman
        </Button>
        <p>
          <button onClick={() => history.back()} className="underline cursor-pointer">
            Kembali
          </button>
        </p>
        <a href="/" className="underline">
          Kembali ke halaman utama
        </a>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </main>
    );
  } else {
    return (
      <main className="flex flex-col gap-2 p-1">
        <Button className="w-fit" onClick={() => window.location.reload()}>
          Segarkan/<em>Refresh</em> Halaman
        </Button>
        <p>
          <button onClick={() => history.back()} className="underline cursor-pointer">
            Kembali
          </button>
        </p>
        <a href="/" className="underline">
          Kembali ke halaman utama
        </a>
        <h1>Unknown Error</h1>;
      </main>
    );
  }
}
