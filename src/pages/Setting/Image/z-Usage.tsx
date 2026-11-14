import { Panel } from "../z-Panel";
import { formatSize } from "../Data/util-file";
import { SkeletonText } from "~/components/ui/skeleton";
import { TextError } from "~/components/TextError";
import { pageData } from "./data";

/**
 * What is on disk now, and what the job would touch.
 *
 * Every label, unit and noun here is static — only the numbers arrive — so the
 * panel is never swapped for a skeleton and nothing moves when the scan answers.
 * The plan is one key, so the four figures land together; each is still its own
 * `delay={0}` gate, because a value inside a line is the shape that holds its
 * place without a reserved height (`error={null}`: the panel head owns the one
 * error, and two notices for one failure is a bug).
 */
export function Usage() {
  const frame = pageData.useFrame(["plan"]);

  return (
    <Panel title="Gambar tersimpan">
      <TextError>{frame.error === null ? null : frame.error.message}</TextError>
      <dl className="flex flex-col divide-y">
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-muted-foreground">Ukuran sekarang</dt>
          <dd className="text-base font-medium tabular-nums">
            <pageData.Gate
              keys={["plan"]}
              delay={0}
              pulse={<SkeletonText className="w-16" />}
              error={null}
            >
              {({ plan }) => formatSize(plan.bytes)}
            </pageData.Gate>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-muted-foreground">Jumlah gambar</dt>
          <dd className="text-base font-medium tabular-nums">
            <pageData.Gate
              keys={["plan"]}
              delay={0}
              pulse={<SkeletonText className="w-8" />}
              error={null}
            >
              {({ plan }) => plan.total.toLocaleString("id-ID")}
            </pageData.Gate>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-muted-foreground">Bisa dikonversi ke WebP</dt>
          <dd className="text-base font-medium tabular-nums">
            <pageData.Gate
              keys={["plan"]}
              delay={0}
              pulse={<SkeletonText className="w-8" />}
              error={null}
            >
              {({ plan }) => plan.convert.toLocaleString("id-ID")}
            </pageData.Gate>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-muted-foreground">Isi yang sama (duplikat)</dt>
          <dd className="text-base font-medium tabular-nums">
            <pageData.Gate
              keys={["plan"]}
              delay={0}
              pulse={<SkeletonText className="w-16" />}
              error={null}
            >
              {({ plan }) =>
                plan.duplicates === 0
                  ? // A real zero, not a placeholder: "tidak ada" is an answer.
                    "Tidak ada"
                  : `${plan.duplicates.toLocaleString("id-ID")} · ${formatSize(plan.duplicateBytes)}`
              }
            </pageData.Gate>
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Gambar yang berkasnya tidak ada di perangkat ini dilewati, bukan dianggap rusak. Foto yang
        tersimpan di riwayat penjualan tidak diubah.
      </p>
    </Panel>
  );
}
