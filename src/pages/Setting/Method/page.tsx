import { Item } from "./Item";
import { NewBtn } from "./NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./TabLink";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Method } from "~/database/method/get-all";
import { DefaultMeth } from "~/store/method/get";

export default function Page() {
  const methods = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 p-5 flex-1 overflow-auto">
      <h1 className="text-big font-bold">Metode Pembayaran</h1>
      <TabLink />
      <Suspense fallback={<Loading />}>
        <MethodComp methods={methods} />
      </Suspense>
      <NewBtn />
    </div>
  );
}

function MethodComp({
  methods: promise,
}: {
  methods: Promise<
    [Result<"Aplikasi bermasalah", Method[]>, Result<"Aplikasi bermasalah", DefaultMeth>]
  >;
}) {
  const [[errMsg, data], [errMeth, defMeths]] = use(promise);
  const [method] = useMethod();
  if (errMsg !== null || errMeth) {
    return <TextError>{errMsg ?? errMeth}</TextError>;
  }
  const methods = data.filter((d) => d.kind === method && d.name !== undefined) as Method[];
  return (
    <div className="flex flex-col gap-2 overflow-auto">
      {methods.map((m) => {
        const kind = m.kind;
        if (kind === "cash") return null;
        const defVal = defMeths[kind];
        return <Item key={m.id} method={m} defVal={defVal} />;
      })}
    </div>
  );
}
