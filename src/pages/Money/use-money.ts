import { useOutletContext } from "react-router";

export function useMoney() {
  const context = useOutletContext<{
    money: {
      timestamp: number | undefined;
      value: number | undefined;
      name: string;
      id: string;
      type: DB.MoneyType;
    }[];
  }>();
  return context.money;
}
