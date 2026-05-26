import { useSearchParams } from "react-router";

export function useSelected() {
  const [search, setSearch] = useSearchParams();
  const selected = search.get("selected");
  function setSelected(clicked: string | null) {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      if (clicked === null || clicked === selected) {
        search.delete("selected");
      } else {
        search.set("selected", clicked);
      }
      return search;
    });
  }
  return [selected, setSelected] as const;
}

export function useUnselect() {
  const [, setSelected] = useSelected();
  return () => setSelected(null);
}

