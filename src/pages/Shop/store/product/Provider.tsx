import { useInitProducts } from "./use-init";
import { TextError } from "~/components/TextError";

export function ProductProvider({ children, tab }: { children: React.ReactNode; tab: number }) {
  const error = useInitProducts(tab);
  if (error !== null) return <TextError>{error}</TextError>;
  return children;
}
