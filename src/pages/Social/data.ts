import { createPageData } from "~/components/page-data";
import type { Social, SocialError } from "~/services/social";

/** The receipt's contact rows: one live list, written per row. */
export type SocialData = { socials: Social[] };

export const pageData = createPageData<SocialData, SocialError>("SocialPage");
