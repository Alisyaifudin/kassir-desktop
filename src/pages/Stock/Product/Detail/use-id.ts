import { useOutletContext } from "react-router";

export function useId() {
  const context = useOutletContext();
  if (
    typeof context === "object" &&
    context !== null &&
    "id" in context &&
    typeof context.id === "number"
  )
    return context.id;
  console.error(context);
  throw new Error("No id in the context");
}
