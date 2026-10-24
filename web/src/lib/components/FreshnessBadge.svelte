<script lang="ts">
	import { CircleCheckBig, Clock, CircleQuestionMark, TriangleAlert, type LucideIcon } from "@lucide/svelte";
	import { useFreshness } from "#lib/hooks.svelte.ts";
	import { fmtDateStr } from "#lib/format.ts";
	import type { Freshness, FreshnessStatus } from "#lib/types.ts";

	/**
	 * Badge kesegaran data (spec D1): tiga status, satu pertanyaan — "angka di
	 * layar ini masih bisa dipercaya?".
	 *
	 * `basis="indeks"` dipakai bagian bersumber indeks (banner & kartu rezim):
	 * yang dibaca `index_status` — penanda terpisah yang tidak pernah mengubah
	 * status halaman. Endpoint yang gagal dibaca tampil sebagai "tak diketahui"
	 * dengan sebabnya di `title`, bukan menggantung di "memuat…" selamanya.
	 */
	const META: Record<FreshnessStatus, { badge: string; label: string; icon: LucideIcon }> = {
		segar: { badge: "badge badge-buy", label: "Segar", icon: CircleCheckBig },
		basi: { badge: "badge badge-warn", label: "Basi", icon: TriangleAlert },
		"tak diketahui": { badge: "badge badge-hold", label: "Tak diketahui", icon: CircleQuestionMark }
	};

	const BASIS_LABEL: Record<string, string> = {
		panel: "panel saham",
		indeks: "indeks"
	};

	const tgl = (s: string | null | undefined): string => fmtDateStr(s) ?? "—";

	let {
		basis = "panel",
		freshness
	}: {
		basis?: "panel" | "indeks";
		freshness?: Freshness | null;
	} = $props();

	const query = useFreshness();
	const f = $derived(freshness ?? query.data ?? null);
	const meta = $derived(f ? (META[basis === "indeks" ? f.index_status : f.status] ?? META["tak diketahui"]) : null);

	const judul = $derived.by(() => {
		if (!f) return "";
		const sesi = basis === "indeks" ? f.index_latest : f.panel_latest;
		return [
			f.reason,
			sesi ? `Sesi terakhir ${tgl(sesi)}${f.expected ? ` · diharapkan ${tgl(f.expected)}` : ""}` : null,
			`Diperiksa ${tgl(f.checked_at.slice(0, 10))}`
		]
			.filter(Boolean)
			.join(" · ");
	});
</script>

{#if !f}
	{#if query.error}
		{@const masuk = META["tak diketahui"]}
		{@const IkonMasuk = masuk.icon}
		<span
			class="{masuk.badge} gap-1"
			role="status"
			title="Kesegaran tidak bisa dibaca ({query.error instanceof Error
				? query.error.message
				: String(query.error)})."
		>
			<IkonMasuk size={12} aria-hidden />
			{masuk.label} ({BASIS_LABEL[basis]})
		</span>
	{:else}
		<span class="badge badge-hold" role="status">
			<Clock size={12} class="mr-1" aria-hidden />
			Kesegaran memuat…
		</span>
	{/if}
{:else if meta}
	{@const Ikon = meta.icon}
	<span class="{meta.badge} gap-1" role="status" title={judul}>
		<Ikon size={12} aria-hidden />
		{meta.label} ({BASIS_LABEL[basis]})
	</span>
{/if}
