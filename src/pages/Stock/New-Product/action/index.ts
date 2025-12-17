import { ActionFunctionArgs } from "react-router";
import { newAction } from "./new";
import { proposeBarcodeAction } from "./propose-barcode";
import { auth } from "~/lib/auth";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "new": {
      const error = await newAction(formdata);
      return { error, action };
    }
    case "propose-barcode": {
      const error = await proposeBarcodeAction();
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export type Action = typeof action;
