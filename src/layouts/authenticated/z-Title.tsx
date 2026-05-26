import { Result } from "~/lib/result";
import { store } from "~/store";
import { TextError } from "~/components/TextError";
import { Link } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";

export function Title() {
  const res = Result.use({
    fn: () => store.owner(),
    key: "owner",
  });
  return Result.match(res, {
    onLoading() {
      return (
        <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
          <Skeleton className="h-5 w-24" />
        </div>
      );
    },
    onError(error) {
      console.error(error.e);
      return <TextError>{error.e.message}</TextError>;
    },
    onSuccess(title) {
      return (
        <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
          <Link title={title} to="/" className="text-normal font-medium italic opacity-80">
            {title.slice(0, 16)}
          </Link>
        </div>
      );
    },
  });
}

export function revalidateTitle() {
  Result.revalidate("owner");
}
