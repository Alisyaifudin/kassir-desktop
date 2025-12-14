import { Suspense, use } from "react";
import { data, isRouteErrorResponse, Outlet, useLoaderData, useRouteError } from "react-router";
import { LoadingBig } from "~/components/Loading";
import { Size } from "~/lib/store-old";
import { DefaultError, Result } from "~/lib/utils";
import { store } from "~/store";
import { Provider } from "./Provider";
import { Button } from "~/components/ui/button";

export async function loader() {
  const size = store.size();
  return data(size);
}

export default function Layout() {
  const size = useLoaderData<typeof loader>();
  return (
    <Suspense fallback={<LoadingBig />}>
      <Wrapper size={size} />
    </Suspense>
  );
}

function Wrapper({ size: promise }: { size: Promise<Result<DefaultError, Size>> }) {
  const [errMsg, size] = use(promise);
  if (errMsg) throw new Error(errMsg);
  return (
    <Provider size={size}>
      <Outlet />
    </Provider>
  );
}

export function ErrorBoundary() {
  const env = import.meta.env.DEV;
  const error = useRouteError();
  if (!env) {
    return (
      <main className="flex flex-col gap-2">
        <p>Halaman bermasalah</p>
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
    return (
      <main className="flex flex-col gap-2 p-1">
        <Button className="w-fit" onClick={() => window.location.reload()}>
          Segarkan/<em>Refresh</em> Halaman
        </Button>
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
        <a href="/" className="underline">
          Kembali ke halaman utama
        </a>
        <h1>Unknown Error</h1>;
      </main>
    );
  }
}
