import { useEffect, useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { GROUP_LABEL } from "~/components/sync/z-Progress";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import { AUTO_INTERVALS, SYNC_GROUPS, type AutoInterval, type SyncGroup } from "~/services/sync";
import { useAutoSync } from "./use-auto-sync";

/**
 * When the app syncs without being asked (`SYNC-V2.md` §9.10).
 *
 * Below the manual panel because it builds on it: the two buttons are how an
 * operator proves the server and token work, and this panel is how they stop
 * needing to press them. Everything here saves on click — a schedule is a
 * preference, not a document, so there is no Simpan to forget.
 *
 * The master switch is one decision ("keep this till fresh"), and the rows under
 * it are the two ways that happens: a timer, and the writes that should leave
 * immediately. Both end in the same full cycle, so a shop never ends up with two
 * kinds of sync that mean different things.
 */
export function AutoPanel({ configured }: { configured: boolean }) {
  const { auto, nextAt, pending, error, patch } = useAutoSync();
  // A countdown is the only thing on this panel that changes without an event,
  // so it is also the only thing that needs a clock. Half a minute is finer than
  // the label's own resolution (whole minutes).
  useTick(30_000);

  const intervalOn = auto.interval;
  const everyGroup = auto.editGroups.length === SYNC_GROUPS.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <p id="auto-sync-label" className="text-base font-semibold">
              Sinkronkan otomatis
            </p>
            <Spinner when={pending} />
          </div>
          <p className="text-sm text-muted-foreground">
            Satu putaran penuh saat aplikasi dibuka, lalu mengikuti pilihan di bawah.
          </p>
        </div>
        <Switch
          checked={auto.enabled}
          onCheckedChange={(enabled) => patch({ enabled })}
          aria-labelledby="auto-sync-label"
        />
      </div>

      {auto.enabled ? (
        <div className="flex flex-col gap-5 border-t pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-col">
                <p id="auto-interval-label" className="text-base font-semibold">
                  Setiap beberapa menit
                </p>
                <p className="text-sm text-muted-foreground">
                  {intervalOn
                    ? "Dihitung dari selesainya putaran sebelumnya, jadi tidak pernah menumpuk."
                    : "Mati: aplikasi hanya menyinkronkan saat dibuka dan saat ada perubahan data."}
                </p>
              </div>
              <Switch
                checked={intervalOn}
                onCheckedChange={(on) => patch({ interval: on })}
                aria-labelledby="auto-interval-label"
              />
            </div>

            {intervalOn ? (
              <>
                <IntervalSlider
                  value={auto.everyMinutes}
                  onChange={(everyMinutes) => patch({ everyMinutes })}
                />
                <Countdown nextAt={nextAt} />
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-col">
                <p id="auto-edit-label" className="text-base font-semibold">
                  Setiap ada perubahan data
                </p>
                <p className="text-sm text-muted-foreground">
                  Menyimpan data langsung memulai satu putaran penuh. Perubahan yang berdekatan
                  digabung jadi satu putaran.
                </p>
              </div>
              <Switch
                checked={everyGroup}
                onCheckedChange={(on) => patch({ editGroups: on ? [...SYNC_GROUPS] : [] })}
                aria-labelledby="auto-edit-label"
              />
            </div>

            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {SYNC_GROUPS.map((group) => (
                <div key={group} className="flex items-center justify-between gap-3">
                  <label htmlFor={idOf(group)} className="text-sm">
                    {GROUP_LABEL[group]}
                  </label>
                  <Switch
                    id={idOf(group)}
                    checked={auto.editGroups.includes(group)}
                    onCheckedChange={(on) =>
                      patch({ editGroups: withGroup(auto.editGroups, group, on) })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {configured ? null : (
        <p className="text-sm text-muted-foreground">
          Jadwal ini baru berjalan setelah alamat server dan token tersimpan di atas.
        </p>
      )}

      <TextError>{error?.message ?? null}</TextError>
      <p className="text-xs text-muted-foreground">
        Sinkronisasi otomatis memakai putaran yang sama dengan tombol di atas — unduh, simpan,
        unggah. Selama berjalan, indikator di pojok kanan atas menunjukkan kemajuannya, dan
        kegagalan tetap terlihat di sana walau layar ini sudah ditutup.
      </p>
    </div>
  );
}

/**
 * One dot per interval, drawn rather than a native `<input type="range">`.
 *
 * The stops are 1/2/5/10 — not evenly spaced in value — so a real range input
 * would spend most of its travel between two options the app does not have. Four
 * dots are also four labels the operator can read, which a thumb position alone
 * cannot say. The dots are radios, so arrow keys work for free.
 */
function IntervalSlider({
  value,
  onChange,
}: {
  value: AutoInterval;
  onChange: (next: AutoInterval) => void;
}) {
  const count = AUTO_INTERVALS.length;
  const index = Math.max(
    0,
    AUTO_INTERVALS.findIndex((stop) => stop === value),
  );
  // The dots live in equal columns, so their centres are 1/(2n) in from each edge
  // and the rule between the two outer dots is (n-1)/n of the row — the same
  // arithmetic the Perbesaran row uses, so the two controls read as one design.
  const inset = 100 / (2 * count);
  const span = (100 * (count - 1)) / count;
  const filled = (index / (count - 1)) * span;
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  return (
    <div role="radiogroup" aria-labelledby="auto-interval-label" className="flex flex-col gap-2">
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-muted-foreground/40"
          style={{ left: `${inset}%`, width: `${span}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground transition-[width] duration-200"
          style={{ left: `${inset}%`, width: `${filled}%` }}
        />
        <div className="relative grid" style={columns}>
          {AUTO_INTERVALS.map((stop) => (
            <div key={stop} className="flex items-center justify-center">
              <input
                id={`auto-interval-${stop}`}
                type="radio"
                name="auto-interval"
                value={stop}
                checked={stop === value}
                onChange={() => onChange(stop)}
                className="peer sr-only"
              />
              <label
                htmlFor={`auto-interval-${stop}`}
                className={cn(
                  "size-10 cursor-pointer rounded-full hover:border-2 hover:border-muted-foreground/40 hover:bg-card z-10",
                  "peer-hover:border-foreground/70",
                  "peer-checked:border-foreground peer-checked:bg-foreground",
                  "peer-focus-visible:ring-2 relative group peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
                )}
              >
                <span className="sr-only">Setiap {stop} menit</span>
              </label>
              <div className="size-4 border-2 bg-card rounded-full absolute z-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid" style={columns}>
        {AUTO_INTERVALS.map((stop) => (
          <label
            key={stop}
            htmlFor={`auto-interval-${stop}`}
            className={cn(
              "cursor-pointer text-center text-sm",
              stop === value ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {stop} mnt
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * When the next timer cycle is due.
 *
 * Rounded up and in whole minutes: "sekitar 4 menit lagi" is what an operator can
 * act on, and a seconds counter on a schedule that is measured from the end of a
 * run would be wrong by the length of the run anyway.
 */
function Countdown({ nextAt }: { nextAt: number | null }) {
  if (nextAt === null) {
    return <p className="text-sm text-muted-foreground">Menunggu putaran yang sedang berjalan.</p>;
  }
  const left = nextAt - Date.now();
  const minutes = Math.ceil(left / 60_000);
  return (
    <p className="text-sm text-muted-foreground">
      {left <= 0 ? "Berikutnya sebentar lagi." : `Berikutnya sekitar ${minutes} menit lagi.`}
    </p>
  );
}

/** A re-render every `ms`, for a row whose content is a clock rather than an event. */
function useTick(ms: number): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), ms);
    return () => clearInterval(timer);
  }, [ms]);
}

/** `groups` with `group` added or removed, in `SYNC_GROUPS` order. */
function withGroup(groups: SyncGroup[], group: SyncGroup, on: boolean): SyncGroup[] {
  const next = new Set(groups);
  if (on) next.add(group);
  else next.delete(group);
  return SYNC_GROUPS.filter((candidate) => next.has(candidate));
}

/** One id per group, shared by its switch and its label. */
function idOf(group: SyncGroup): string {
  return `auto-edit-${group}`;
}
