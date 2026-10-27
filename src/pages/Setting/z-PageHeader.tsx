/**
 * The head of a settings screen. It names the destination the hub's row promised,
 * and the sentence underneath is the same one that row carried — clicking a row
 * should land you somewhere that answers to the same words.
 *
 * It is `text-2xl` like every other content page in the app, but semibold rather
 * than bold: the topbar's title is the screen, this is the page inside it, and two
 * bold 24px lines stacked read as a slide, not a tool.
 */
export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-base text-muted-foreground">{description}</p>
    </header>
  );
}
