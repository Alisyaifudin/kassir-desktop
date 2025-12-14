import { Item, type Method } from "./Item";
import { NewBtn } from "./NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./TabLink";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Size } from "~/lib/store-old";

export default function Page() {
  const { methods, size } = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 p-5 flex-1 overflow-auto">
      <h1 className="text-big font-bold">Metode Pembayaran</h1>
      <TabLink />
      <Suspense fallback={<Loading />}>
        <MethodComp methods={methods} size={size} />
      </Suspense>
    </div>
  );
}

function MethodComp({
  methods: promise,
  size,
}: {
  methods: Promise<Result<"Aplikasi bermasalah", DB.Method[]>>;
  size: Size;
}) {
  const [errMsg, data] = use(promise);
  const [method] = useMethod();
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  const methods = data.filter((d) => d.method === method && d.name !== null) as Method[];
  return (
    <div className="flex flex-col gap-2">
      {methods.map((m) => (
        <Item key={m.id} method={m} size={size} />
      ))}
      <NewBtn size={size} />
    </div>
  );
}
