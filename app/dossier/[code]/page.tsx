"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStockDossier } from "@/lib/hooks";
import { API_BASE } from "@/lib/api";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import type { DossierSection, StockDossier } from "@/lib/types";

const SECTION_ORDER: { key: keyof StockDossier["sections"]; title: string }[] = [
  { key: "profil", title: "Profil" },
  { key: "valuasi", title: "Valuasi" },
  { key: "faktor", title: "Faktor & Verdict" },
  { key: "arus_asing", title: "Arus Asing" },
  { key: "aktivitas_broker", title: "Aktivitas Broker" },
  { key: "sentimen", title: "Sentimen" },
  { key: "catatan_risiko", title: "Catatan Risiko" },
];

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "number") return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return v.every((x) => typeof x === "string") ? (v as string[]).join("; ") : `${v.length} item`;
  }
  if (typeof v === "object") return "Lihat detail";
  return String(v);
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
}

type Obj = Record<string, unknown>;

function isPlainObject(v: unknown): v is Obj {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function ScalarDl({ rows }: { rows: [string, unknown][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-[var(--border)] py-1 last:border-0">
          <dt className="text-muted capitalize">{k.replace(/_/g, " ")}</dt>
          <dd className="max-w-[60%] text-right font-medium tabular-nums break-words">{fmtValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Render data bagian: skalar sebagai tabel, objek bersarang sebagai sub-grup,
 * daftar teks sebagai butir penuh lebar, daftar objek sebagai jumlah item.
 */
function ScalarRows({ data }: { data: Obj }) {
  const scalars: [string, unknown][] = [];
  const nested: [string, Obj][] = [];
  const textLists: [string, string[]][] = [];
  const objectLists: [string, number][] = [];

  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    if (isPlainObject(v)) nested.push([k, v]);
    else if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (v.every((x) => typeof x === "string")) textLists.push([k, v as string[]]);
      else objectLists.push([k, v.length]);
    } else scalars.push([k, v]);
  }

  if (scalars.length + nested.length + textLists.length + objectLists.length === 0) {
    return <EmptyState message="Tidak ada data untuk bagian ini." />;
  }

  return (
    <div className="space-y-3">
      {scalars.length > 0 && <ScalarDl rows={scalars} />}
      {objectLists.length > 0 && <ScalarDl rows={objectLists.map(([k, n]) => [k, `${n} item`])} />}
      {nested.map(([k, obj]) => {
        const rows = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && !isPlainObject(v) && !Array.isArray(v));
        if (rows.length === 0) return null;
        return (
          <div key={k}>
            <p className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">{k.replace(/_/g, " ")}</p>
            <ScalarDl rows={rows} />
          </div>
        );
      })}
      {textLists.map(([k, items]) => (
        <div key={k}>
          <p className="text-muted mb-1 text-xs capitalize">{k.replace(/_/g, " ")}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-snug">
            {items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, section }: { title: string; section: DossierSection }) {
  return (
    <Card
      title={title}
      subtitle={section.session_date ? `Data sesi ${section.session_date}` : "Tanpa tanggal sesi"}
      right={
        section.stale ? (
          <span className="badge badge-warn">Lebih lama dari sesi terakhir</span>
        ) : section.session_date ? (
          <span className="badge badge-buy">Segar</span>
        ) : null
      }
    >
      {section.error ? (
        <ErrorState message={`Bagian ini gagal dimuat: ${section.error}`} />
      ) : section.data && Object.keys(section.data).length > 0 ? (
        <ScalarRows data={section.data} />
      ) : section.data ? (
        <EmptyState message="Tidak ada data untuk bagian ini pada sesi tersebut." />
      ) : (
        <EmptyState message="Tidak ada data untuk bagian ini." />
      )}
    </Card>
  );
}

export default function DossierPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code?.toUpperCase();
  const { data, error, isLoading } = useStockDossier(code ?? null);

  if (!code) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <p className="text-muted">Kode emiten tidak valid.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="text-muted text-xs" aria-label="Breadcrumb">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/stock/${code}`} className="hover:underline">{code}</Link>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-[var(--fg)]">Dossier</span>
          </nav>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Dossier {code}</h1>
          {data && (
            <p className="text-muted mt-1 text-xs">
              Sesi terakhir pasar: {data.latest_session ?? "—"} · Dibuat {fmtTimestamp(data.generated_at)} WIB
            </p>
          )}
        </div>
        <a
          href={`${API_BASE}/api/stocks/${encodeURIComponent(code)}/dossier.pdf`}
          className="btn btn-primary"
          download
        >
          Unduh PDF
        </a>
      </header>

      {error && <ErrorState message={`Gagal memuat dossier: ${error.message}`} />}
      {isLoading && !data && <Skeleton className="h-96 w-full" />}

      {data && (
        <>
          {data.stale_sections.length > 0 && (
            <p className="badge-warn mb-4 rounded-lg px-3 py-2 text-xs">
              Ada {data.stale_sections.length} bagian yang datanya lebih lama dari sesi terakhir:{" "}
              {data.stale_sections.join(", ")}.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SECTION_ORDER.map(({ key, title }) => (
              <SectionCard key={key} title={title} section={data.sections[key]} />
            ))}
          </div>
          <p className="text-muted mt-6 text-xs">
            Ringkasan data dari sumber yang sudah ada, bukan rekomendasi beli atau jual.
          </p>
        </>
      )}
    </main>
  );
}
