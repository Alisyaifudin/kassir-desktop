import { Loader2, Plus } from "lucide-react";
import { useRef } from "react";
import { Gate, InlineError } from "~/components/page-data";
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
  const res = pageData.use("profile");

  return (
    <Card title="Profil kasir" contract={`use("profile") · Effect ${LATENCY.profile} ms`}>
      <Gate res={res} skeleton={<Rows rows={2} />}>
        {({ data }) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{data.name}</p>
            <p className="text-small text-muted-foreground">
              {data.role} · {data.shop}
            </p>
          </div>
        )}
      </Gate>
    </Card>
  );
}

/**
 * One key, slower source. Appears at ~1300 ms, and dims with a sweep when the
 * mutation card invalidates it — the numbers stay readable the whole time.
 */
export function StatsCard() {
  const res = pageData.use("stats");

  return (
    <Card title="Ringkasan hari ini" contract={`use("stats") · Effect ${LATENCY.stats} ms`}>
      <Gate res={res} skeleton={<Rows rows={3} />}>
        {({ data, refetching }) => (
          <Stale when={refetching} mode="dim">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Figure label="Pesanan" value={data.orders.toLocaleString("id-ID")} />
              <Figure
                label="Omzet"
                value={data.revenue.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              />
              <Figure
                label="Rata-rata"
                value={data.average.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              />
            </dl>
          </Stale>
        )}
      </Gate>
    </Card>
  );
}

/**
 * Two keys. `profile` lands at 400 ms and `stats` at 1300 ms, so this body
 * appears at 1300 ms — the last one, never a half-filled card. The stale flag
 * comes from `useAll`, so invalidating either key dims the pair.
 */
export function PairCard() {
  const res = pageData.useAll("profile", "stats");

  return (
    <Card
      title="Profil + ringkasan"
      contract={`useAll("profile", "stats") · tunggu yang terakhir`}
    >
      <Gate res={res} skeleton={<Rows rows={3} />}>
        {({ data, refetching }) => (
          <Stale when={refetching} mode="dim">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{data.profile.name}</p>
              <p className="text-small text-muted-foreground">
                {data.stats.orders.toLocaleString("id-ID")} pesanan ·{" "}
                {data.stats.revenue.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-small text-muted-foreground">{data.profile.shop}</p>
            </div>
          </Stale>
        )}
      </Gate>
    </Card>
  );
}

/** One key, latest source. Still a skeleton at 2 s — long after its neighbours. */
export function FeedCard() {
  const res = pageData.use("feed");

  return (
    <Card title="Aktivitas terbaru" contract={`use("feed") · Stream ${LATENCY.feed} ms`}>
      <Gate res={res} skeleton={<Rows rows={3} />}>
        {({ data }) => (
          <ul className="flex flex-col gap-1">
            {data.map((item) => (
              <li key={item.id} className="truncate text-small">
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </Gate>
    </Card>
  );
}

/**
 * A live key the mutation writes into. Because it is a `Stream`, the write
 * pushes the new list by itself; the stale flag only spans the write, and this
 * widget says so with a spinner instead of muting the list.
 */
export function ActivityCard() {
  const res = pageData.use("activity");

  return (
    <Card title="Aktivitas (live)" contract={`use("activity") · Stream`}>
      <Gate res={res} skeleton={<Rows rows={2} />}>
        {({ data, refetching }) => (
          <Stale when={refetching} mode="spinner">
            <ul className="flex flex-col gap-1">
              {data.map((item) => (
                <li key={item.id} className="truncate text-small">
                  {item.text}
                </li>
              ))}
            </ul>
          </Stale>
        )}
      </Gate>
    </Card>
  );
}

/** A failing key. The default inline error stays inside this card. */
export function BrokenCard() {
  const res = pageData.use("broken");
  const refresh = pageData.useRefresh();

  return (
    <Card title="Widget gagal" contract={`use("broken") · gagal ${LATENCY.broken} ms`}>
      <Gate res={res} skeleton={<Rows rows={2} />} onRetry={() => refresh("broken")}>
        {({ data }) => <p className="text-small">{data}</p>}
      </Gate>
    </Card>
  );
}

/** A live stream: success arrives at 0 ms and keeps changing, with no refetch. */
export function BeatCard() {
  const res = pageData.use("beat");

  return (
    <Card title="Data live" contract={`use("beat") · Stream tiap 1,5 s`}>
      <Gate res={res} skeleton={<Rows rows={1} />}>
        {({ data }) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium tabular-nums">Denyut ke-{data.beat}</p>
            <p className="text-small text-muted-foreground tabular-nums">
              {new Date(data.at).toLocaleTimeString("id-ID")}
            </p>
          </div>
        )}
      </Gate>
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

        <p className="text-small text-muted-foreground">
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
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
