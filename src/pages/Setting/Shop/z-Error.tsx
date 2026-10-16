import { createErrorBoundary } from "~/components/createErrorBoundary";
import { TextError } from "~/components/TextError";
import { InfoError } from "~/services/info";

export const InfoErrorBoundary = createErrorBoundary(InfoError);

export function InfoErrorFallback({ error }: { error: InfoError }) {
  return <TextError>{error.message}</TextError>;
}
