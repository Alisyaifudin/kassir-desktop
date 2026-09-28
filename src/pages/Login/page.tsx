import { LoginForm } from "./z-LoginForm";
import { FreshForm } from "./z-FreshForm";
import { db } from "~/database";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Consumer, createLoader, Loader } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import type { DbError } from "~/database/instance";

export const cashiersLoader = createLoader(db.cashier.get.all());

export default function Page() {
  return (
    <Loader loader={cashiersLoader}>
      <Consumer Error={Error} loader={cashiersLoader} loading={<LoadingView />}>
        <Content />
      </Consumer>
    </Loader>
  );
}

function Content() {
  const cashiers = cashiersLoader.useData();
  return (
    <div className="flex flex-1 flex-col justify-center bg-zinc-950">
      {cashiers.length > 0 ? <LoginForm cashiers={cashiers} /> : <FreshForm />}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-1 flex-col justify-center bg-zinc-950">
      <Loading />
    </div>
  );
}

function Error({ error }: { error: DbError }) {
  console.error(error.e);
  return <ErrorComponent title="Aplikasi bermasalah ☠">{error.e.message}</ErrorComponent>;
}
