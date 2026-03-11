import { useSearchParams } from "react-router";

export function useSelected() {
  const [search] = useSearchParams();
  return getSelected(search);
}

function getSelected(search: URLSearchParams): number | null {
  const selected = search.get("selected");
  if (selected === null || Number.isNaN(selected)) {
    return null;
  }
  return Number(selected);
}

export function setSelected(search: URLSearchParams, clicked: number, selected: number | null) {
  if (clicked === selected) {
    search.delete("selected");
  } else {
    search.set("selected", clicked.toString());
  }
}

export function setUnselect(search: URLSearchParams) {
  search.delete("selected");
}
