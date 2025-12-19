import { ActionFunctionArgs, redirect } from "react-router";
import { integer } from "~/lib/utils";
import { payCreditAction } from "./pay-credit";
import { linkProductAction } from "./link-product";
import { editNoteAction } from "./edit-note";
import { changeTimestampAction } from "./change-timestamp";
import { changeModeAction } from "./change-mode";
import { changeMethodAction } from "./change-method";
import { toCreditAction } from "./to-credit";
import { auth } from "~/lib/auth";

export async function action({ request, params }: ActionFunctionArgs) {
  const parsed = integer.safeParse(params.timestamp);
  if (!parsed.success) {
    throw redirect("/records");
  }
  const timestamp = parsed.data;
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "pay-credit": {
      const error = await payCreditAction(timestamp, formdata);
      return { error, action };
    }
    case "to-credit": {
      const error = await toCreditAction(timestamp);
      return { error, action };
    }
    case "link-product": {
      const error = await linkProductAction(formdata);
      return { error, action };
    }
    case "edit-note": {
      const error = await editNoteAction(timestamp, formdata);
      return { error, action };
    }
    case "change-timestamp": {
      const error = await changeTimestampAction(timestamp, formdata);
      return { error, action };
    }
    case "change-mode": {
      const error = await changeModeAction(timestamp, formdata);
      return { error, action };
    }
    case "change-method": {
      const error = await changeMethodAction(timestamp, formdata);
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export type Action = typeof action;
