import { createErrorBoundary } from "~/components/createErrorBoundary";
import { TextError } from "~/components/TextError";
import { LogError } from "~/services/log";

export const LogErrorBoundary = createErrorBoundary(LogError);

export function LogErrorFallback({ error }: { error: LogError }) {
  return <TextError>{error.message}</TextError>;
}
