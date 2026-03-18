import { useOutletContext } from "react-router";

export function useMoney() {
  const context = useOutletContext<{
    money: {
      kind: string;
      kindId: number;
      value: number;
      timestamp: number;
    }[];
  }>();
  return context.money;
}
