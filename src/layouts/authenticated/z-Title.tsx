import { store } from "~/store";
import { TextError } from "~/components/TextError";
import { Link } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { Consumer, createLoader, Loader } from "~/components/Loader";
import type { StoreError } from "~/store/error";

export const titleLoader = createLoader(store.owner());

export function Title() {
  return (
    <Loader loader={titleLoader}>
      <Consumer Error={TitleError} loader={titleLoader} loading={<TitleLoading />}>
        <TitleContent />
      </Consumer>
    </Loader>
  );
}

function TitleContent() {
  const title = titleLoader.useData();
  return (
    <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
      <Link title={title} to="/" className="text-normal font-medium italic opacity-80">
        {title.slice(0, 16)}
      </Link>
    </div>
  );
}

function TitleLoading() {
  return (
    <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

function TitleError({ error }: { error: StoreError }) {
  console.error(error.e);
  return <TextError>{error.e.message}</TextError>;
}

export function revalidateTitle() {
  void titleLoader.run();
}
