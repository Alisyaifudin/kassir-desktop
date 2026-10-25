import { IOError } from "~/lib/effect-error";
import { saveJson } from "~/lib/export";

export { saveJson };

/** The message to show for a service error or a file error alike. */
export function messageOf(error: { message: string } | IOError): string {
  return error instanceof IOError ? error.e.message : error.message;
}
