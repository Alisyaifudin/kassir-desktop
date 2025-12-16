import { ActionFunctionArgs } from "react-router";
import { productAction } from "./product";
import { recordAction } from "./record";
import { auth } from "~/lib/auth";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "product": {
      const res = await productAction();
      return { res, action };
    }
    case "record": {
      const res = await recordAction({ context, formdata });
      return { res, action };
    }
    default:
      throw new Error("Invalid action");
  }
}

export type Action = typeof action;
