import { Result } from "~/lib/result";
import { store } from "~/store";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";

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
        <div className="pb-4 small:pb-2">
          <p className="text-5xl small:text-3xl italic">{title}</p>
        </div>
      );
    },
  });
}

export function revalidateTitle() {
  Result.revalidate("owner");
}
