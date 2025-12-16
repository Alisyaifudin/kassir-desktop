import { action as sizeAction } from "./size";
import { action as infoAction } from "./info";
import { action as showCashierAction } from "./show-cashier";
import { auth } from "~/lib/auth";
import { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "size": {
      const error = await sizeAction(formdata);
      return {
        action,
        error,
      } as const;
    }
    case "info": {
      const error = await infoAction(formdata);
      return {
        action,
        error,
      } as const;
    }
    case "show-cashier": {
      const error = await showCashierAction(formdata);
      return {
        action,
        error,
      } as const;
    }
    default:
      throw new Error("Invalid action");
  }
}

export type Action = typeof action;
