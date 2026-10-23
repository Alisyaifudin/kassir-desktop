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

export const pageData = createPageData<LogData, LogError>("LogPage");
