import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Info } from "./z-Info";
import { ExtraForm } from "./z-ExtraForm";
import { Extra } from "~/database/extra/caches";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { LoadingBig } from "~/components/Loading";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";

export default function Page({ id }: { id: number }) {
  return (
    <main className="py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden">
      <Button asChild variant="link" className="self-start">
        <Link to="/stock?tab=extra">
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <div className="flex gap-2 h-full max-h-[calc(100vh-170px)] overflow-hidden">
        <Loader id={id} />
      </div>
    </main>
  );
}

function Loader({ id }: { id: number }) {
  const res = useData(id);
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError(error) {
      switch (error._tag) {
        case "DbError":
          log.error(error.e);
          return <ErrorComponent>{error.e.message}</ErrorComponent>;
        case "NotFound":
          return <NotFound />;
      }
    },
    onSuccess(extra) {
      return <Detail extra={extra} />;
    },
  });
}

function Detail({ extra }: { extra: Extra }) {
  const role = useUser().role;
  switch (role) {
    case "admin":
      return <ExtraForm extra={extra} />;
    case "user":
      return <Info extra={extra} />;
  }
}
