import { version } from "~/lib/constants";
import { Header } from "./z-Header";
import { NavRow } from "./z-NavRow";
import { Section } from "./z-Section";
import { Zoom } from "./z-Zoom";
import { useNav } from "./use-nav";

/**
 * Pengaturan is a table of contents, not a launcher wall.
 *
 * Each group is a section label in a left rail — the same two-column shape the
 * detail pages use for their sidebar — beside one panel of full-width rows. That
 * keeps every destination at `text-base` (the app is read at arm's length) and
 * makes the group names structural rather than another heading to compete with
 * the destinations themselves.
 *
 * Below the destinations sits the one setting that is not a page: the interface
 * scale, which applies the moment the slider moves. It is separated by a hairline
 * because it is a different kind of row — a control, not a door.
 */
export default function Page() {
  const { groups } = useNav();

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 pb-10">
      <Header />
      {groups.map((group) => (
        <Section key={group.section} title={group.section}>
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {group.items.map((item) => (
              <NavRow key={item.path} item={item} />
            ))}
          </ul>
        </Section>
      ))}
      <div className="border-t pt-6">
        <Section title="Tampilan">
          <div className="rounded-xl border bg-card px-4 py-3">
            <Zoom />
          </div>
        </Section>
      </div>
      <p className="text-sm text-muted-foreground">Kassir versi {version}</p>
    </div>
  );
}
