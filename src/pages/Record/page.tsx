import { Header } from "./Header";
import { Record } from "./Record";
import { useLoaderData } from "react-router";
import { Data, Loader } from "./loader";
import { cn, DefaultError, Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { LoadingBig } from "~/components/Loading";
import { css } from "./style.css";
import { Detail } from "./Detail";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { useParams } from "./use-params";

export default function Page() {
  const { methods, records } = useLoaderData<Loader>();
  return (
    <main className="flex flex-col gap-2 p-2 flex-1 text-3xl overflow-hidden">
      <Header methods={methods} />
      <Suspense fallback={<LoadingBig />}>
        <Wrapper records={records} />
      </Suspense>
    </main>
  );
}

export function Wrapper({ records: promise }: { records: Promise<Result<DefaultError, Data[]>> }) {
  const [errMsg, records] = use(promise);
  const params = useParams();
  const size = useSize();
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  const selected = params.selected;
  const record =
    selected === null ? undefined : records.find((r) => r.record.timestamp === selected);
  return (
    <div className={cn("grid gap-2 h-full overflow-hidden", css.bodyGrid[size])}>
      <Record records={records} />
      <div className="border-l" />
      <Show value={record}>
        {({ record, extras, products }) => (
          <Detail extras={extras} products={products} record={record} />
        )}
      </Show>
    </div>
  );
}
