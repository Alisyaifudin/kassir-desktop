import { Link, useLoaderData, useSearchParams } from "react-router";
import { getBackURL } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Info } from "./Info";
import { AdditionalForm } from "./ExtraForm";
import { Loader } from "./loader";
import { Extra } from "~/database/extra/caches";
import { auth } from "~/lib/auth";

export default function Page() {
  const extra = useLoaderData<Loader>();
  const [search] = useSearchParams();
  const backURL = getBackURL("/stock", search);
  return (
    <main className="py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden">
      <Button asChild variant="link" className="self-start">
        <Link to={backURL}>
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <div className="flex gap-2 h-full max-h-[calc(100vh-170px)] overflow-hidden">
        <Detail extra={extra} />
      </div>
    </main>
  );
}

function Detail({ extra }: { extra: Extra }) {
  const role = auth.user().role;
  switch (role) {
    case "admin":
      return <AdditionalForm extra={extra} />;
    case "user":
      return <Info extra={extra} />;
  }
}
