import { useSearchParams } from "react-router";

export function useSelected() {
  const [search, setSearch] = useSearchParams();
  const selected = getSelected(search);
  function setSelected(clicked: number | null) {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      if (clicked === null || clicked === selected) {
        search.delete("selected");
      } else {
        search.set("selected", clicked.toString());
      }
      return search;
    });
  }
  return [selected, setSelected] as const;
}

function getSelected(search: URLSearchParams): number | null {
  const selected = search.get("selected");
  if (selected === null || Number.isNaN(selected)) {
    return null;
  }
  return Number(selected);
}

export function useUnselect() {
  const [, setSelected] = useSelected();
  return () => setSelected(null);
}

// export function setUnselect(search: URLSearchParams) {
//   search.delete("selected");
// }
