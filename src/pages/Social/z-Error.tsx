import { TextError } from "~/components/TextError";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { SocialError } from "~/services/social";

export const SocialErrorBoundary = createErrorBoundary(SocialError);

/**
 * Renders where the list sits, so the fallback is that one line rather than the
 * full-page `ErrorComponent` the legacy page dropped in.
 */
export function SocialErrorFallback({ error }: { error: SocialError }) {
  return <TextError>{`Kontak bermasalah: ${error.message}`}</TextError>;
}
