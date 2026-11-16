import { useSearchParams } from "~/services/route/react";

/** What the right pane holds: the classifier, or the report itself. */
export type ReportView = "klasifikasi" | "laporan";

function getView(search: URLSearchParams): ReportView {
  return search.get("view") === "laporan" ? "laporan" : "klasifikasi";
}

/**
 * Which face of the right pane is open, kept in the URL.
 *
 * The write **replaces** the history entry — like `/records`' mode tab, switching
 * face is a filter inside this screen, not a place to go Back to. It deliberately
 * does *not* clear `selected`: the rail's selection is the same record in both
 * faces, and coming back from the report to the classifier should land where you
 * left it.
 */
export function useView() {
  const [search, setSearch] = useSearchParams();
  const view = getView(search);
  function setView(next: ReportView) {
    setSearch(
      (old) => {
        const params = new URLSearchParams(old);
        // `klasifikasi` is the default, so it is the absence of the param.
        if (next === "klasifikasi") params.delete("view");
        else params.set("view", next);
        return params;
      },
      { replace: true },
    );
  }
  return [view, setView] as const;
}
