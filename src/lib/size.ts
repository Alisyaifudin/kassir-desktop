import { Size } from "~/services/config";

export function setSize(size: Size) {
  if (size === "small") {
    document.body.classList.add("small");
  } else {
    document.body.classList.remove("small");
  }
}
