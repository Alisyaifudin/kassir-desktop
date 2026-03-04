import { TextError } from "~/components/TextError";
import { useInitExtras } from ".";

export function ExtraProvider({ children, tab }: { children: React.ReactNode; tab: number }) {
  const error = useInitExtras(tab);
  if (error !== null) return <TextError>{error}</TextError>;
  return children;
}
