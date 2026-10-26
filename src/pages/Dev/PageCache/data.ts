import {
  createPageData,
  type PageDataApi,
  type PageDataSources,
} from "~/components/page-data";
import {
  activityRef,
  broken,
  clock,
  ledger,
  orders,
  profile,
  type LabActivity,
  type LabClock,
  type LabError,
  type LabLedgerRow,
  type LabOrders,
  type LabProfile,
} from "./z-sources";

/**
 * One contract, two registries — the experiment is the *difference* between
 * them, so they must describe exactly the same page.
 *
 * `plainData` is the layer as it ships today: every mount reads every key.
 * `cachedData` opts into `pageCache`: a key paints its last answer, and only an
 * invalidated one re-reads.
 */
type LabData = {
  profile: LabProfile;
  orders: LabOrders;
  ledger: LabLedgerRow[];
  activity: LabActivity[];
  clock: LabClock;
  broken: string;
};

export type LabApi = PageDataApi<LabData, LabError>;

export const plainData = createPageData<LabData, LabError>("DevPageCachePlain");

/** The lab's keys, named so the inspector's buttons can address a tag directly. */
const TAGS = {
  profile: "profile",
  orders: "orders",
  ledger: "ledger",
  activity: "activity",
  clock: "clock",
  broken: "broken",
} as const;

export const cachedData = createPageData<LabData, LabError>("DevPageCache", {
  cache: { tags: TAGS },
});

/** The same sources for both, so only the cache can explain a difference. */
export function labSources(days: number): PageDataSources<LabData, LabError> {
  return {
    profile,
    orders,
    ledger: ledger(days),
    activity: activityRef.changes,
    clock,
    broken,
  };
}
