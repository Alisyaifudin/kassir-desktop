import { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth";
import { delAction } from "./del";
import { toTransactionAction } from "./to-transaction";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "delete": {
      if (user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      const error = await delAction(formdata, request.url);
      return {error, action}
    }
    case "to-transaction": {
      const error = await toTransactionAction(formdata);
      return {error, action}
    }
    default:
      throw new Error(`Invalid action: ${action}`)
  }
}

export type Action = typeof action;