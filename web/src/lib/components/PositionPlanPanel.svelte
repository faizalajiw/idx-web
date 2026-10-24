<script lang="ts">
	import { fmtNum, fmtNum1 } from "#lib/format.ts";
	import { useStockRecommendation } from "#lib/hooks.svelte.ts";
	import { asNumber, portfolioQuery, usePortfolio } from "#lib/portfolio.svelte.ts";
	import type { PositionPlan, RecommendationRow, StockRecommendation } from "#lib/types.ts";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";

	/**
	 * Panel rencana posisi di halaman emiten (permukaan B, spec P5).
	 *
	 * Memakai `usePortfolio` yang sama dengan strip di papan, jadi angka modal dan
	 * risiko yang diketik di satu halaman terbaca di halaman lain lewat localStorage.
	 * Angka rencananya sendiri datang dari backend (fungsi yang sama dengan papan),
	 * bukan dihitung ulang di klien.
	 */

	const rp = (v: number | null | undefined) =>
		v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

	/** Plafon ditulis apa adanya; `null` = memang tidak berlaku (bukan nol). */
	const plafon = (v: number | null | undefined) =>
		v === null || v === undefined ? "tidak berlaku" : `${fmtNum(v)}%`;

	/** Harga beli: rentang bila ada, kalau tidak harga acuan. */
	function hargaBeli(row: RecommendationRow): string {
		if (row.entry_low !== null && row.entry_high !== null) {
			return `${rp(row.entry_low)} – ${fmtNum(row.entry_high)}`;
		}
		return rp(row.entry_ref);
	}

	/**
	 * Sebab penahanan memakai kalimat backend sendiri (spec D1 untuk data basi,
	 * spec 6.5/Q5 untuk gerbang rezim). `gate.reason` sudah diawali "rezim menolak",
	 * jadi di sini tidak diberi awalan yang mengulang maksudnya.
	 */
	function sebabTahan(rec: StockRecommendation): string {
		if (rec.gate?.blocked) return rec.gate.reason ?? "kondisi pasar belum mendukung";
		return rec.freshness?.reason ?? "data sesi ini belum segar";
	}

	let { code }: { code: string } = $props();

	const { state, setField } = usePortfolio();
	const query = $derived(portfolioQuery(state));

	const recommendation = useStockRecommendation(() => code, () => query);
	// Getter hook: baca lewat objek, lalu salin ke `$derived` agar tetap reaktif.
	const data = $derived(recommendation.data);
	const error = $derived(recommendation.error);
	const isLoading = $derived(recommendation.isLoading);

	const modal = $derived(asNumber(state.modal));
	const risk = $derived(asNumber(state.riskPct));
	const modalSalah = $derived(modal !== null && modal <= 0);
	const riskSalah = $derived(risk !== null && risk <= 0);

	const candidate = $derived(data?.candidate ?? null);
	const plan = $derived(candidate?.plan ?? null);
</script>

{#snippet field(
	id: string,
	label: string,
	value: string,
	invalid: boolean,
	onInput: (value: string) => void
)}
	<div class="min-w-0">
		<label for={id} class="text-muted text-[11px]">{label}</label>
		<input
			{id}
			class="input mt-1 w-full tabular-nums"
			type="number"
			inputmode="decimal"
			min={0}
			step="any"
			autocomplete="off"
			{value}
			aria-invalid={invalid || undefined}
			oninput={(e) => onInput(e.currentTarget.value)}
		/>
	</div>
{/snippet}

{#snippet tabelRencana(plan: PositionPlan, stop: number | null)}
	<!-- Sebab wajib terbaca begitu angka bisa menyesatkan: ada plafon memotong,
	     porsi jatuh ke nol, atau modal belum diisi sehingga rupiah dan lot kosong
	     (D14/R4: angka nol tidak boleh tampil tanpa sebab). Saat porsi penuh
	     dipakai apa adanya, catatannya cuma "tidak ada plafon yang memotong". -->
	{@const sebabPerlu =
		plan.binding_cap !== null || plan.pct === 0 || plan.lots === null || plan.lots === 0}
	<table class="data-table mt-3 max-w-sm">
		<tbody>
			<tr>
				<td class="text-muted">Porsi</td>
				<td class="text-right font-semibold tabular-nums">{fmtNum1(plan.pct)}% modal</td>
			</tr>
			<tr>
				<td class="text-muted">Nilai beli</td>
				<td class="text-right tabular-nums">{rp(plan.rupiah)}</td>
			</tr>
			<tr>
				<td class="text-muted">Jumlah lot</td>
				<td class="text-right tabular-nums">
					{plan.lots === null ? "-" : `${fmtNum(plan.lots)} lot`}
				</td>
			</tr>
			<tr>
				<td class="text-muted">Rugi maksimum</td>
				<td class="text-down text-right font-semibold tabular-nums">
					{rp(plan.risk_rupiah)}
				</td>
			</tr>
			<tr>
				<td class="text-muted">Plafon likuiditas</td>
				<td class="text-right tabular-nums">{plafon(plan.caps?.liquidity)}</td>
			</tr>
			<tr>
				<td class="text-muted">Plafon rezim</td>
				<td class="text-right tabular-nums">{plafon(plan.caps?.regime)}</td>
			</tr>
		</tbody>
	</table>
	{#if sebabPerlu}
		<p class="mt-2 text-xs leading-snug text-[var(--warn)]" role="status">
			{plan.note}
		</p>
	{/if}
	<p
		class="mt-3 border-t border-dashed border-[var(--border)] pt-3 text-xs leading-snug text-[var(--warn)]"
	>
		Rencana batal kalau harga menembus {rp(stop)}. Di bawah level itu tidak ada menambah posisi.
	</p>
{/snippet}

{#snippet tabelLevel(rec: StockRecommendation, row: RecommendationRow)}
	<p class="mt-3 text-xs leading-snug text-[var(--warn)]" role="status">
		Ukuran posisi ditahan ({sebabTahan(rec)}). Yang tetap tampil cuma levelnya.
	</p>
	<table class="data-table mt-3 max-w-sm">
		<tbody>
			<tr>
				<td class="text-muted">Harga beli</td>
				<td class="text-right tabular-nums">{hargaBeli(row)}</td>
			</tr>
			<tr>
				<td class="text-muted">Batas rugi</td>
				<td class="text-down text-right tabular-nums">{rp(row.stop)}</td>
			</tr>
			<tr>
				<td class="text-muted">Target</td>
				<td class="text-up text-right tabular-nums">{rp(row.target)}</td>
			</tr>
		</tbody>
	</table>
{/snippet}

<section class="card p-4" aria-labelledby="rencana-posisi-panel">
	<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
		<h2 id="rencana-posisi-panel" class="text-sm font-semibold">Rencana posisi</h2>
		<p class="text-muted text-[11px] leading-snug">
			Angka ini kamu isi sendiri, bukan catatan posisi nyata. Tersimpan di browser ini saja.
		</p>
	</div>

	<div class="mt-3 grid max-w-md grid-cols-2 gap-3">
		{@render field("panel-modal", "Modal (Rp)", state.modal, modalSalah, (v) =>
			setField("modal", v)
		)}
		{@render field("panel-risk", "Risiko per transaksi (%)", state.riskPct, riskSalah, (v) =>
			setField("riskPct", v)
		)}
	</div>
	{#if risk === null}
		<p class="text-muted mt-1 text-[11px] leading-snug">
			Risiko kosong: backend memakai 1% per transaksi.
		</p>
	{/if}
	{#if modalSalah || riskSalah}
		<p class="mt-1 text-[11px] leading-snug text-[var(--warn)]" role="status">
			Isi angka lebih dari 0.
		</p>
	{/if}

	{#if error}
		<div class="mt-3">
			<ErrorState
				message="Gagal memuat rencana posisi: {error instanceof Error
					? error.message
					: String(error)}"
				onRetry={() => void recommendation.mutate()}
			/>
		</div>
	{:else if isLoading && !data}
		<Skeleton class="mt-3 h-40 w-full" />
	{:else if !data}
		<div class="mt-3">
			<EmptyState message="Data emiten ini belum bisa dimuat." />
		</div>
	{:else if !candidate}
		<div class="mt-3">
			<EmptyState
				message={data.reason ?? "Belum ada kandidat beli untuk emiten ini pada sesi terakhir."}
			/>
		</div>
	{:else if candidate.withheld}
		{@render tabelLevel(data, candidate)}
	{:else if plan === null || plan.pct === null}
		<div class="mt-3">
			<EmptyState
				message={plan?.note ?? "Rencana ukuran tidak bisa dihitung dari level ini."}
			/>
		</div>
	{:else}
		{@render tabelRencana(plan, candidate.stop)}
	{/if}
</section>
