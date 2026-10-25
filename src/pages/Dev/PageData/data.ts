import { createPageData } from "~/components/page-data";
import type {
  DemoActivity,
  DemoBeat,
  DemoError,
  DemoFeedItem,
  DemoProfile,
  DemoStats,
} from "./z-sources";

/**
 * The page's data contract, declared once.
 *
 * Widgets import this file — not the service, not a stream, not a prop chain.
 * `DemoError` is the union a page's error boundary would take; `unknown` is fine
 * too when there is only the default inline error.
 */
export type DemoPageData = {
  profile: DemoProfile;
  stats: DemoStats;
  feed: DemoFeedItem[];
  activity: DemoActivity[];
  beat: DemoBeat;
  broken: string;
  /** Answers once, then fails every refresh — the `stale` demo. */
  flaky: string;
};

export const pageData = createPageData<DemoPageData, DemoError>("DevPageData");
