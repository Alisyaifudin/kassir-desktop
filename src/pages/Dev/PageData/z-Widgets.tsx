import { Loader2, Plus } from "lucide-react";
import { useRef } from "react";
import { InlineError } from "~/components/page-data";
import { Button } from "~/components/ui/button";
import { pageData } from "./data";
import { Card, Rows } from "./z-Card";
import { Stale } from "./z-Stale";
import { LATENCY, addActivity, addOrders } from "./z-sources";

/**
 * Seven widgets over six keys. Each one is tiny because the widget owns nothing
 * but its own presentation: `get the slice → Gate it → render`. How a stale key
 * looks is the widget's decision (`Stale` here; the pattern itself says nothing).
 */

/** One key, read-once source. Appears at ~400 ms. */
export function ProfileCard() {
  return (
    <Card title="Profil kasir" contract={`Gate keys={["profile"]} · Effect ${LATENCY.profile} ms`}>
      <pageData.Gate keys={["profile"]} pulse={<Rows rows={2} />}>
        {({ profile }) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{profile.name}</p>
            <p className="text-sm text-muted-foreground">
              {profile.role} · {profile.shop}
            </p>
          </div>
        )}
      </pageData.Gate>
    </Card>
  );
}

/**
 * One key, slower source. Appears at ~1300 ms, and dims with a sweep when the
 * mutation card invalidates it — the numbers stay readable the whole time.
 */
export function StatsCard() {
  // Freshness is a *state* read, not a value: the card decides how a refetch
  // looks, and the gate below only decides whether there is anything to draw.
  const status = pageData.useStatus("stats");

  return (
    <Card title="Ringkasan hari ini" contract={`Gate keys={["stats"]} · Effect ${LATENCY.stats} ms`}>
      <pageData.Gate keys={["stats"]} pulse={<Rows rows={3} />}>
        {({ stats }) => (
          <Stale when={status === "refreshing"} mode="dim">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Figure label="Pesanan" value={stats.orders.toLocaleString("id-ID")} />
              <Figure
                label="Omzet"
                value={stats.revenue.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              />
              <Figure
                label="Rata-rata"
                value={stats.average.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              />
            </dl>
          </Stale>
        )}
      </pageData.Gate>
    </Card>
  );
}

/**
 * Two keys. `profile` lands at 400 ms and `stats` at 1300 ms, so this body
 * appears at 1300 ms — the last one, never a half-filled card. The stale flag
 * comes from `useAll`, so invalidating either key dims the pair.
 */
export function PairCard() {
  // One `useFrame` for the pair's freshness: the group is `refreshing` when
  // either key is, which is exactly what the old `useAll` flag meant.
  const frame = pageData.useFrame(["profile", "stats"]);

  return (
    <Card
      title="Profil + ringkasan"
      contract={`Gate keys={["profile", "stats"]} · tunggu yang terakhir`}
    >
      <pageData.Gate keys={["profile", "stats"]} pulse={<Rows rows={3} />}>
        {({ profile, stats }) => (
          <Stale when={frame.status === "refreshing"} mode="dim">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{profile.name}</p>
              <p className="text-sm text-muted-foreground">
                {stats.orders.toLocaleString("id-ID")} pesanan ·{" "}
                {stats.revenue.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-sm text-muted-foreground">{profile.shop}</p>
            </div>
          </Stale>
        )}
      </pageData.Gate>
    </Card>
  );
}

/** One key, latest source. Still a skeleton at 2 s — long after its neighbours. */
export function FeedCard() {
  return (
    <Card title="Aktivitas terbaru" contract={`Gate keys={["feed"]} · Stream ${LATENCY.feed} ms`}>
      <pageData.Gate keys={["feed"]} pulse={<Rows rows={3} />}>
        {({ feed }) => (
          <ul className="flex flex-col gap-1">
            {feed.map((item) => (
              <li key={item.id} className="truncate text-sm">
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </pageData.Gate>
    </Card>
  );
}

/**
 * A live key the mutation writes into. Because it is a `Stream`, the write
 * pushes the new list by itself; the stale flag only spans the write, and this
 * widget says so with a spinner instead of muting the list.
 */
export function ActivityCard() {
  const status = pageData.useStatus("activity");

  return (
    <Card title="Aktivitas (live)" contract={`Gate keys={["activity"]} · Stream`}>
      <pageData.Gate keys={["activity"]} pulse={<Rows rows={2} />}>
        {({ activity }) => (
          <Stale when={status === "refreshing"} mode="spinner">
            <ul className="flex flex-col gap-1">
              {activity.map((item) => (
                <li key={item.id} className="truncate text-sm">
                  {item.text}
                </li>
              ))}
            </ul>
          </Stale>
        )}
      </pageData.Gate>
    </Card>
  );
}

/** A failing key. The default inline error stays inside this card. */
export function BrokenCard() {
  return (
    <Card title="Widget gagal" contract={`Gate keys={["broken"]} · gagal ${LATENCY.broken} ms`}>
      {/* No `error` slot: the gate's default is an inline notice whose own button
          re-reads the keys it blamed, so a retry needs no wiring. */}
      <pageData.Gate keys={["broken"]} pulse={<Rows rows={2} />}>
        {({ broken }) => <p className="text-sm">{broken}</p>}
      </pageData.Gate>
    </Card>
  );
}

/** A live stream: success arrives at 0 ms and keeps changing, with no refetch. */
export function BeatCard() {
  return (
    <Card title="Data live" contract={`Gate keys={["beat"]} · Stream tiap 1,5 s`}>
      <pageData.Gate keys={["beat"]} pulse={<Rows rows={1} />}>
        {({ beat }) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium tabular-nums">Denyut ke-{beat.beat}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {new Date(beat.at).toLocaleTimeString("id-ID")}
            </p>
          </div>
        )}
      </pageData.Gate>
    </Card>
  );
}

/**
 * The write side. Both buttons invalidate keys; the buttons show their own
 * round-trip (`pending`), while the *cards* decide what the invalidation looks
 * like (`refetching`).
 */
export function MutationCard() {
  const orders = pageData.useMutation(addOrders, { refetch: ["stats"] });
  const activity = pageData.useMutation(addActivity, { refetch: ["activity"] });
  const seq = useRef(0);

  return (
    <Card title="Mutasi" contract={`useMutation(run, { refetch: [...] })`}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={orders.pending}
            onClick={() => void orders.mutate(3)}
          >
            {orders.pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Tambah 3 pesanan
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activity.pending}
            onClick={() => {
              seq.current += 1;
              void activity.mutate(`Aktivitas baru #${seq.current}`);
            }}
          >
            {activity.pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Catat aktivitas
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          stats:{" "}
          <span className="font-medium text-foreground">
            {orders.pending ? "menulis…" : orders.refetching ? "menyegarkan…" : "segar"}
          </span>
          {" · "}
          activity:{" "}
          <span className="font-medium text-foreground">
            {activity.pending
              ? "menulis…"
              : activity.refetching
                ? "menyegarkan…"
                : "segar"}
          </span>
        </p>

        {orders.error === null ? null : <InlineError error={orders.error} />}
        {activity.error === null ? null : <InlineError error={activity.error} />}
      </div>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
