import { Result } from "~/lib/result";
import { store } from "~/store";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Link } from "react-router";

export function Title() {
  const res = Result.use({
    fn: () => store.owner(),
    key: "owner",
  });
  return Result.match(res, {
    onLoading() {
      return <Spinner when={true} />;
    },
    onError(error) {
      console.error(error.e);
      return <TextError>{error.e.message}</TextError>;
    },
    onSuccess(title) {
      return (
        <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
          <Link title={title} to="/" className="text-xl font-medium italic opacity-80">
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
