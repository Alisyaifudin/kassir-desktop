import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Show } from "~/components/Show";
import { InlineError, type PageDataStatus } from "~/components/page-data";
import { Button } from "~/components/ui/button";
import { SkeletonText } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { pageData, type DemoPageData } from "./data";
import { Card, Rows } from "./z-Card";
import { LATENCY, touchFlaky } from "./z-sources";

/**
 * `pageData.Gate` — one component for both granularities.
 *
 * A **region** whose body is the thing loading: `pulse` is a skeleton, `delay`
 * stays at its 200 ms default, the error slot is the region's.
 *
 * A **value inside a static line**: same component, `delay={0}`, `pulse` sized to
 * the value, `error={null}` because the card owns the error treatment.
 *
 * The gate takes the keys, so it cannot gate something other than what its
 * children read — `data` is `Pick<TMap, K>` and an undeclared key does not
 * compile.
 *
 * | card | the claim |
 * |---|---|
 * | satu key | the body is a happy path: no `Result`, no `null` |
 * | dua key | the body waits for **every** declared key, never a half-filled card |
 * | gagal | a typed failure reaches the `error` slot |
 * | gagal menyegarkan | a lost refresh keeps the value and says `stale` |
 * | mutasi | a write whose refetch loses says `stale`, and the region never blanks |
 * | nilai berdenyut | `delay={0}` per value: the frame is static, only numbers pulse |
 */

const STATUS_TONE: Record<PageDataStatus, string> = {
  pending: "border-muted bg-muted text-muted-foreground",
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  refreshing: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  stale: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** Static chrome: the status line is outside the gate, so it is live while the body waits. */
function StatusChip({ name }: { name: keyof DemoPageData }) {
  const status = pageData.useStatus(name);

  return (
    <span
      title="pageData.useStatus(key)"
      className={cn("w-fit rounded-full border px-2 py-0.5 text-small", STATUS_TONE[status])}
    >
      {name}: {status}
    </span>
  );
}

function Retry({ name }: { name: keyof DemoPageData }) {
  const refresh = pageData.useRefresh();

  return (
    <Button variant="outline" size="sm" onClick={() => refresh(name)}>
      <RefreshCw className="size-4 small:size-3.5" />
      Coba lagi
    </Button>
  );
}

/** One key. The body is a happy path: `profile` is just there. */
export function GateOneKey() {
  return (
    <Card
      title="Gate · satu key"
      contract={`pageData.Gate keys={["profile"]} · ${LATENCY.profile} ms`}
    >
      <div className="flex flex-col gap-2">
        <StatusChip name="profile" />
        <pageData.Gate keys={["profile"]} pulse={<Rows rows={2} />}>
          {({ profile }) => (
            <div className="flex flex-col gap-1">
              <p className="font-medium">{profile.name}</p>
              <p className="text-small text-muted-foreground">
                {profile.role} · {profile.shop}
              </p>
            </div>
          )}
        </pageData.Gate>
      </div>
    </Card>
  );
}

/** The slot is generic over the page's `DemoError`, so `error.message` compiles. */
export function GateFailure() {
  return (
    <Card
      title="Gagal · slot error bertipe"
      contract={`error={(e: DemoError) => …} · gagal ${LATENCY.broken} ms`}
    >
      <div className="flex flex-col gap-2">
        <StatusChip name="broken" />
        <pageData.Gate
          keys={["broken"]}
          pulse={<Rows rows={2} />}
          error={(error) => (
            <div className="flex flex-col items-start gap-2">
              <p className="text-small text-destructive">{error.message}</p>
              <Retry name="broken" />
            </div>
          )}
        >
          {({ broken }) => <p className="text-small">{broken}</p>}
        </pageData.Gate>
      </div>
    </Card>
  );
}

/**
 * The refresh that loses. The value stays exactly where it is, the gate is never
 * re-entered, and the only change is the word `stale` — which is the whole reason
 * `Result` grew a `failure` field.
 */
export function GateStale() {
  return (
    <Card
      title="Gagal menyegarkan · nilai tetap"
      contract={`useStatus("flaky") → stale · gagal ${LATENCY.flaky} ms`}
    >
      <div className="flex flex-col gap-2">
        <StatusChip name="flaky" />
        <pageData.Gate keys={["flaky"]} pulse={<Rows rows={2} />}>
          {({ flaky }) => <FlakyBody value={flaky} />}
        </pageData.Gate>
      </div>
    </Card>
  );
}

function FlakyBody({ value }: { value: string }) {
  const status = pageData.useStatus("flaky");
  const refresh = pageData.useRefresh();

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="font-medium">{value}</p>
      <Show when={status === "stale"}>
        <p className="text-small text-amber-600 dark:text-amber-400">
          Penyegaran terakhir gagal — nilai lama dipertahankan.
        </p>
      </Show>
      <Button variant="outline" size="sm" onClick={() => refresh("flaky")}>
        <RefreshCw className="size-4 small:size-3.5" />
        Segarkan (akan gagal)
      </Button>
    </div>
  );
}

/**
 * The write side, inside a gate. `useMutation` is unchanged — same `mutate`,
 * `pending`, `refetching` — and grows one word: `stale`, true when the write
 * landed but the refetch that follows it lost. The region never blanks: a write
 * that changes a key is not a first load.
 */
export function GateWrite() {
  return (
    <Card
      title="Mutasi · refetch gagal"
      contract={`useMutation(touchFlaky, { refetch: ["flaky"] }) → stale`}
    >
      <div className="flex flex-col gap-2">
        <StatusChip name="flaky" />
        <pageData.Gate keys={["flaky"]} pulse={<Rows rows={2} />}>
          {({ flaky }) => <WriteBody value={flaky} />}
        </pageData.Gate>
      </div>
    </Card>
  );
}

function WriteBody({ value }: { value: string }) {
  const save = pageData.useMutation(touchFlaky, { refetch: ["flaky"] });

  const line = writeStatus(save);

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="font-medium">{value}</p>
      <p className="text-small text-muted-foreground">status tulis: {line}</p>
      <Button size="sm" disabled={save.pending} onClick={() => void save.mutate(undefined)}>
        <RefreshCw className="size-4 small:size-3.5" />
        Tulis, lalu segarkan
      </Button>
    </div>
  );
}

/**
 * The fine-grained case: the labels are static, so each number is its own gate
 * with its own placeholder and `delay={0}`. The card's *frame* only reads state
 * (`useFrame`), never values — so a failure is one error treatment for the card,
 * not three small ones inside it.
 */
export function GateValues() {
  const frame = pageData.useFrame(["stats"]);
  const refresh = pageData.useRefresh();

  return (
    <Card
      title="Nilai berdenyut · delay 0"
      contract={`per nilai: pageData.Gate delay={0} · frame: useFrame(["stats"])`}
    >
      <div className="flex flex-col gap-2">
        <StatusChip name="stats" />
        <dl className="grid grid-cols-2 gap-2 text-center">
          <Figure label="Omzet">
            <pageData.Gate
              keys={["stats"]}
              delay={0}
              pulse={<ValuePulse className="w-14" />}
              error={null}
            >
              {({ stats }) => money(stats.revenue)}
            </pageData.Gate>
          </Figure>
          <Figure label="Rata-rata">
            <pageData.Gate
              keys={["stats"]}
              delay={0}
              pulse={<ValuePulse className="w-14" />}
              error={null}
            >
              {({ stats }) => money(stats.average)}
            </pageData.Gate>
          </Figure>
        </dl>
        <Show value={frame.error}>
          {(error) => <InlineError error={error} onRetry={() => refresh("stats")} />}
        </Show>
      </div>
    </Card>
  );
}

/** A static label around a value that gates itself. */
function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function ValuePulse({ className }: { className?: string }) {
  return <SkeletonText className={className} />;
}

/** Where a write is: its own round-trip, then the refetch behind it. */
function writeStatus(save: { pending: boolean; refetching: boolean; stale: boolean }): string {
  if (save.pending) return "menulis…";
  if (save.refetching) return "menyegarkan…";
  if (save.stale) return "tersimpan, gagal menyegarkan";
  return "tersimpan";
}

function money(value: number): string {
  return value.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}
