import { LoginForm } from "./z-LoginForm";
import { FreshForm } from "./z-FreshForm";
import { ErrorComponent } from "~/components/ErrorComponent";
import { LoaderMany, useStream } from "~/components/Loader";
import { createManyErrorBoundary } from "~/components/createErrorBoundary";
import { Loading } from "~/components/Loading";
import { service } from "~/services";
import { AuthError } from "~/services/auth";
import { CashierError } from "~/services/cashier";
import Redirect from "~/components/Redirect";

const LoginErrorBoundary = createManyErrorBoundary(AuthError, CashierError);

export default function Page() {
  const auth = useStream(service.auth.changes);
  const cashiers = useStream(service.cashier.get.changes);

  return (
    <LoginErrorBoundary fallback={LoginError}>
      <LoaderMany res={{ auth, cashiers }} fallback={<LoadingView />}>
        {({ auth: user, cashiers }) =>
          user !== null ? (
            <Redirect to="/" />
          ) : (
            <div className="flex flex-1 flex-col justify-center bg-zinc-950">
              {cashiers.length > 0 ? <LoginForm cashiers={cashiers} /> : <FreshForm />}
            </div>
          )
        }
      </LoaderMany>
    </LoginErrorBoundary>
  );
}

function LoginError({ error }: { error: AuthError | CashierError }) {
  return <ErrorComponent title="Aplikasi bermasalah ☠">{error.message}</ErrorComponent>;
}

function LoadingView() {
  return (
    <div className="flex flex-1 flex-col justify-center bg-zinc-950">
      <Loading />
    </div>
  );
}
