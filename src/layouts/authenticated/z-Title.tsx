import { Link } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { Loader, useStream } from "~/components/Loader";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { TextError } from "~/components/TextError";
import { service } from "~/services";
import { InfoError } from "~/services/info";

const InfoErrorBoundary = createErrorBoundary(InfoError);

export function Title() {
  const res = useStream(service.info.changes);

  return (
    <InfoErrorBoundary fallback={TitleError}>
      <Loader res={res} fallback={<TitleLoading />}>
        {({ data }) => (
          <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
            <Link title={data.name} to="/" className="text-normal font-medium italic opacity-80">
              {data.name.slice(0, 16)}
            </Link>
          </div>
        )}
      </Loader>
    </InfoErrorBoundary>
  );
}

function TitleError({ error }: { error: InfoError }) {
  return <TextError>{error.message}</TextError>;
}

function TitleLoading() {
  return (
    <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
      <Skeleton className="h-5 w-24" />
    </div>
  );
}
