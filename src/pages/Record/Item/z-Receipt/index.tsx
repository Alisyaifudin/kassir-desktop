import { LoaderMany, useStream } from "~/components/Loader";
import type { RecordFull } from "~/services/record";
import { service } from "~/services";
import { ReceiptErrorBoundary, InlineError } from "../z-Error";
import { Body } from "./z-Body";
import { LoadingReceipt } from "./z-Loading";

export function Receipt({ record }: { record: RecordFull }) {
  const info = useStream(service.info.changes);
  const socials = useStream(service.social.get.changes);
  return (
    <ReceiptErrorBoundary fallback={InlineError}>
      <LoaderMany res={{ info, socials }} fallback={<LoadingReceipt />}>
        {({ info, socials }) => <Body record={record} info={info} socials={socials} />}
      </LoaderMany>
    </ReceiptErrorBoundary>
  );
}
