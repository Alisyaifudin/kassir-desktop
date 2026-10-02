import { LoginForm } from "./z-LoginForm";
import { FreshForm } from "./z-FreshForm";
import { LoaderMany, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { service } from "~/services";
import Redirect from "~/components/Redirect";

export default function Page() {
  const user = useStream(service.auth.changes);
  const cashiers = useStream(service.cashier.get.changes);

  return (
    <LoaderMany res={{ user, cashiers }} fallback={<LoadingView />}>
      {({ user, cashiers }) =>
        user !== null ? (
          <Redirect to="/" />
        ) : (
          <div className="flex flex-1 flex-col justify-center bg-zinc-950">
            {cashiers.length > 0 ? <LoginForm cashiers={cashiers} /> : <FreshForm />}
          </div>
        )
      }
    </LoaderMany>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-1 flex-col justify-center bg-zinc-950">
      <Loading />
    </div>
  );
}
