import { ReceiptText } from "lucide-react";
import { LoginForm } from "./z-LoginForm";
import { FreshForm } from "./z-FreshForm";
import { BrandPanel } from "./z-BrandPanel";
import { ErrorComponent } from "~/components/ErrorComponent";
import { LoaderMany, useStream } from "~/components/Loader";
import { createManyErrorBoundary } from "~/components/createErrorBoundary";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import { AuthError } from "~/services/auth";
import { CashierError } from "~/services/cashier";
import Redirect from "~/components/Redirect";

const LoginErrorBoundary = createManyErrorBoundary(AuthError, CashierError);

export default function Page() {
  const auth = useStream(service.auth.changes);
  const cashiers = useStream(service.cashier.get.changes);

  return (
    <div className="flex h-dvh w-full bg-background">
      <BrandPanel />

      <div className="relative flex min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-32 size-96 rounded-full bg-sky-400/20 blur-3xl small:size-72" />
          <div className="absolute -bottom-40 -left-24 size-96 rounded-full bg-indigo-400/20 blur-3xl small:size-72" />
        </div>

        <div className="relative h-full w-full overflow-y-auto ">
          <div className="flex min-h-full items-center justify-center px-6 py-10 small:px-4 small:py-6">
            <div className="w-full max-w-2xl">
              <div className="mb-8 flex items-center gap-3 small:mb-6 small:gap-2 lg:hidden">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white small:size-10">
                  <ReceiptText className="size-7 small:size-6" />
                </div>
                <span className="text-normal font-bold tracking-tight">Kassir</span>
              </div>

              <LoginErrorBoundary fallback={LoginError}>
                <LoaderMany res={{ auth, cashiers }} fallback={<LoadingView />}>
                  {({ auth: user, cashiers }) =>
                    user !== null ? (
                      <Redirect to="/" />
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border bg-card p-8 shadow-2xl small:p-6">
                        {cashiers.length > 0 ? <LoginForm cashiers={cashiers} /> : <FreshForm />}
                      </div>
                    )
                  }
                </LoaderMany>
              </LoginErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginError({ error }: { error: AuthError | CashierError }) {
  return <ErrorComponent title="Aplikasi bermasalah ☠">{error.message}</ErrorComponent>;
}

/** The sign-in card's shape while the session and the cashier list resolve. */
function LoadingView() {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border bg-card p-8 shadow-2xl small:p-6"
      aria-busy="true"
      aria-label="Memuat"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-2 h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
