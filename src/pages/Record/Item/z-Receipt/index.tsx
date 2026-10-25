import type { RecordFull } from "~/services/record";
import { pageData } from "../data";
import { InlineError } from "../z-Error";
import { Body } from "./z-Body";
import { LoadingReceipt } from "./z-Loading";

/**
 * The printed face. The paper is one artifact: a receipt with lines but no shop
 * identity is a lie about a document, so both of its small reads land before the
 * sheet is drawn — and they are two keys, so the gate waits for the last one.
 */
export function Receipt({ record }: { record: RecordFull }) {
  return (
    <pageData.Gate
      keys={["info", "socials"]}
      pulse={<LoadingReceipt />}
      error={(error) => <InlineError error={error} />}
    >
      {({ info, socials }) => <Body record={record} info={info} socials={socials} />}
    </pageData.Gate>
  );
}
