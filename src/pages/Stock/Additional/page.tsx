import { Link, useLoaderData, useSearchParams } from "react-router";
import { cn, getBackURL, sizeClass } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Info } from "./Info";
import { AdditionalForm } from "./AdditionalForm";
import { Loader } from "./loader";
import { Size } from "~/lib/store-old";

export default function Page() {
  const { additional, role, size } = useLoaderData<Loader>();
  const [search] = useSearchParams();
  const backURL = getBackURL("/stock", search);
  return (
    <main
      className={cn(
        "py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden",
        sizeClass[size],
      )}
    >
      <Button asChild variant="link" className="self-start">
        <Link to={backURL}>
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <div className="flex gap-2 h-full max-h-[calc(100vh-170px)] overflow-hidden">
        <Detail role={role} additional={additional} size={size} />
      </div>
    </main>
  );
}

function Detail({
  role,
  additional,
  size,
}: {
  additional: DB.AdditionalItem;
  role: DB.Role;
  size: Size;
}) {
  switch (role) {
    case "admin":
      return <AdditionalForm additional={additional} size={size} />;
    case "user":
      return <Info additional={additional} />;
  }
}
