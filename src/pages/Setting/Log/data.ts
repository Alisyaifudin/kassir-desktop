import { createPageData } from "~/components/page-data";
import type { LogError } from "~/services/log";
import type { LogPage } from "~/services/log/tail";

/**
 * Pengaturan → Log. One key: the console is one file tail, read whole (newest
 * first, with the file's real line count), and every subscription or clear
 * re-reads it.
 */
export type LogData = {
  lines: LogPage;
};

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<LogData, LogError>("LogPage", {
  cache: true,
});
