import { TextError } from "~/components/TextError";
import { LoginForm } from "./LoginForm";
import { FreshForm } from "./FreshForm";
import { Suspense, use } from "react";
import { useLoaderData } from "react-router";
import { Result } from "~/lib/utils";
import { Loader } from "./loader";
import { Cashier } from "~/database/cashier/get-all";

export default function Page() {
  const cashiers = useLoaderData<Loader>();
  return (
    <Suspense>
      <Wrapper cashiers={cashiers} />
    </Suspense>
  );
}

function Wrapper({
  cashiers: promise,
}: {
  cashiers: Promise<Result<"Aplikasi bermasalah", Cashier[]>>;
}) {
  const [errMsg, cashiers] = use(promise);
  if (errMsg) {
    return (
      <main>
        <TextError>Aplikasi bermasalah ☠️</TextError>
      </main>
    );
  }
  if (cashiers.length > 0) {
    return (
      <div className="flex flex-1 flex-col justify-center bg-zinc-950">
        <LoginForm cashiers={cashiers} />
      </div>
    );
  }
  return (
    <main className="flex flex-1 flex-col justify-center bg-zinc-950">
      <FreshForm />;
    </main>
  );
}
