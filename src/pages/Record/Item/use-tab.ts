import { useSearchParams } from "react-router";

/**
 * Which face of the record is showing. Lives in the URL so a receipt can be
 * linked to, and so going back returns to the tab you left.
 */
export function useTab() {
  const [search, setSearch] = useSearchParams();
  const raw = search.get("tab");
  // The ledger is the default face; the receipt is the printable one, reached
  // via the Resi tab when someone wants the paper version.
  const tab = raw === "receipt" ? "receipt" : "detail";

  function setTab(next: string) {
    setSearch((old) => {
      const params = new URLSearchParams(old);
      params.set("tab", next);
      return params;
    });
  }

  return [tab, setTab] as const;
}
