import { createPageData } from "~/components/page-data";
import type { Social, SocialError } from "~/services/social";

/** The receipt's contact rows: one live list, written per row. */
export type SocialData = { socials: Social[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<SocialData, SocialError>("SocialPage", {
  cache: true,
});
