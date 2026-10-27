import { TextError } from "~/components/TextError";

/**
 * Panel-scoped fallbacks. `ErrorComponent` is a full-page fallback, which would
 * blow up this layout, so a failure is contained to the panel that raised it —
 * `pageData.Gate` renders these from a key's own error state.
 */
export function ItemErrorFallback({ error }: { error: { message: string } }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-base font-semibold">Catatan bermasalah</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}

/** The one-liner these narrow panels have room for. */
export function InlineError({ error }: { error: { message: string } }) {
  return <TextError>{error.message}</TextError>;
}
