import { Effect } from "effect";
import { Link } from "react-router";
import { InfoService } from "~/services/info";

export const titleText = Effect.gen(function* () {
  const infoService = yield* InfoService;
  const useName = () => infoService.info.useName();
  return function TitleText() {
    const name = useName();
    return (
      <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
        <Link title={name} to="/" className="text-normal font-medium italic opacity-80">
          {name.slice(0, 16)}
        </Link>
      </div>
    );
  };
});
