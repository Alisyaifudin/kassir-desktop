import { Header } from "./Header";
import { Record } from "./Record";
import { useLoaderData } from "react-router";
import { Data, Loader } from "./loader";
import { cn, DefaultError, Result, sizeClass } from "~/lib/utils";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { Size } from "~/lib/store-old";
import { css } from "./style.css";
import { useSummary } from "./use-summary";
import { Detail } from "./Detail";

export default function Page() {
  const { size, methods, data, role } = useLoaderData<Loader>();
  return (
    <main
      className={cn("flex flex-col gap-2 p-2 flex-1 text-3xl overflow-hidden", sizeClass[size])}
    >
      <Header methods={methods} size={size} />
      <Suspense fallback={<Loading />}>
        <Wrapper role={role} methods={methods} data={data} size={size} />
      </Suspense>
    </main>
  );
}

export function Wrapper({
  methods,
  data: promise,
  size,
  role,
}: {
  methods: DB.Method[];
  data: Promise<Result<DefaultError, Data>>;
  size: Size;
  role: DB.Role;
}) {
  const [errMsg, data] = use(promise);
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  const { items, additionals, discounts, records } = data;
  const { summaries, total } = useSummary(methods, records, items, additionals, discounts);
  return (
    <div className={cn("grid gap-2 h-full overflow-hidden", css.bodyGrid[size])}>
      <Record records={summaries.map((s) => s.record)} size={size} total={total} />
      <div className="border-l" />
      <Detail
        allAdditionals={summaries.flatMap((s) => s.additionals)}
        allItems={summaries.flatMap((s) => s.items)}
        methods={methods}
        records={summaries.map((s) => s.record)}
        role={role}
        size={size}
      />
    </div>
  );
}
