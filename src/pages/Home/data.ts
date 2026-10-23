import { createPageData } from "~/components/page-data";
import type { MoneyError, PocketSummary } from "~/services/money";
import type { Record as RecordModel, RecordError } from "~/services/record";
import type { DaySummaries, DebtFacts } from "./day";

/**
 * Beranda's data contract, one key per independent question.
 *
 * The rules this page is built on — fine-grained value placeholders, reserved
 * card heights, the anti-flash window, writes — live in `.pi/skills/page-data.md`.
 *
 * The band needs the two summaries, the ledger needs the rows, the debt card
 * needs the credit — four reads that used to be one query and therefore one
 * loading state. The pockets belong to another service entirely and are
 * registered by the same provider, so the money card no longer waits behind the
 * day (`useDay` used to be read *above* `<Uang />`, which queued it).
 */
export type HomeData = {
  today: DaySummaries;
  yesterday: DaySummaries;
  debt: DebtFacts;
  records: RecordModel[];
  /** Admin only: the page leaves this key unsubscribed for a cashier. */
  pockets: PocketSummary[];
};

/** Everything a Home key can fail with: the record reads and the pocket read. */
export type HomeError = RecordError | MoneyError;

export const pageData = createPageData<HomeData, HomeError>("HomePage");
