<script lang="ts">
	import { fmtNum } from "#lib/format.ts";
	import {
		asNumber,
		MAX_EXPOSURE_PCT,
		MAX_OPEN_POSITIONS,
		type PortfolioField,
		type PortfolioState
	} from "#lib/portfolio.svelte.ts";

	/** Risiko per transaksi yang dipakai backend (`DEFAULT_RISK_PCT`) bila isian dikosongkan. */
	const DEFAULT_RISK_PCT = 1;

	/**
	 * Strip portofolio di atas papan kandidat (permukaan C, spec P5): menjawab
	 * "masih boleh masuk berapa nama lagi?". Angka porsi sendiri ada di tiap kartu.
	 *
	 * `state` dan `setField` datang dari satu objek modul (`#lib/portfolio.svelte.ts`),
	 * jadi mengetik di sini langsung terlihat di panel rencana posisi.
	 */
	let {
		state,
		setField,
		gated = false
	}: {
		state: PortfolioState;
		setField: (field: PortfolioField, value: string) => void;
		gated?: boolean;
	} = $props();

	const modal = $derived(asNumber(state.modal));
	const risk = $derived(asNumber(state.riskPct));
	const open = $derived(asNumber(state.openPositions));
	const exposure = $derived(asNumber(state.exposurePct));

	const modalSalah = $derived(modal !== null && modal <= 0);
	const riskSalah = $derived(risk !== null && risk <= 0);
	const openSalah = $derived(open !== null && open < 0);
	const eksposurSalah = $derived(exposure !== null && exposure < 0);

	const modalKosong = $derived(state.modal.trim() === "");
	const risikoEfektif = $derived(risk === null || riskSalah ? DEFAULT_RISK_PCT : risk);
	const ruangSisa = $derived(
		exposure === null || eksposurSalah ? null : Math.max(0, MAX_EXPOSURE_PCT - exposure)
	);
	const serentak = $derived(
		open === null || openSalah ? null : Math.round(open * risikoEfektif * 10) / 10
	);

	const FIELDS: {
		id: string;
		label: string;
		field: PortfolioField;
		invalid: boolean;
	}[] = $derived([
		{ id: "ml-modal", label: "Modal (Rp)", field: "modal", invalid: modalSalah },
		{ id: "ml-risk", label: "Risiko per transaksi (%)", field: "riskPct", invalid: riskSalah },
		{ id: "ml-open", label: "Posisi terbuka", field: "openPositions", invalid: openSalah },
		{ id: "ml-exposure", label: "Eksposur sekarang (%)", field: "exposurePct", invalid: eksposurSalah }
	]);
</script>

{#snippet metric(label: string, value: string, tone = "")}
	<div>
		<dt class="text-muted text-[11px]">{label}</dt>
		<dd class="mt-0.5 text-sm font-semibold tabular-nums {tone}">{value}</dd>
	</div>
{/snippet}

<section class="card p-4" aria-labelledby="rencana-posisi-judul">
	<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
		<h2 id="rencana-posisi-judul" class="text-sm font-semibold">Rencana posisi</h2>
		<p class="text-muted text-[11px] leading-snug">
			Angka ini kamu isi sendiri, bukan catatan posisi nyata. Tersimpan di browser ini saja.
		</p>
	</div>

	<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each FIELDS as f (f.id)}
			<div>
				<label for={f.id} class="text-muted text-[11px]">{f.label}</label>
				<input
					id={f.id}
					class="input mt-1 w-full tabular-nums"
					type="number"
					inputmode="decimal"
					min={0}
					step="any"
					autocomplete="off"
					value={state[f.field]}
					aria-invalid={f.invalid || undefined}
					oninput={(e) => setField(f.field, e.currentTarget.value)}
				/>
			</div>
		{/each}
	</div>

	{#if gated}
		<p class="mt-2 text-[11px] leading-snug text-[var(--warn)]" role="status">
			Gerbang rezim menahan kandidat hari ini: angka di atas belum dipakai, jadi kartu di bawah
			cuma menampilkan level harga (tanpa baris porsi).
		</p>
	{/if}

	<dl class="mt-4 flex flex-wrap gap-x-6 gap-y-2">
		{@render metric("Modal", modal === null || modalSalah ? "-" : `Rp ${fmtNum(modal)}`)}
		{@render metric(
			"Risiko per transaksi",
			riskSalah ? "-" : `${fmtNum(risikoEfektif)}%${risk === null ? " (bawaan)" : ""}`
		)}
		{@render metric(
			"Posisi terbuka",
			open === null || openSalah ? "-" : `${fmtNum(open)} dari ${MAX_OPEN_POSITIONS}`,
			open !== null && open > MAX_OPEN_POSITIONS ? "text-[var(--warn)]" : ""
		)}
		{@render metric("Eksposur", exposure === null || eksposurSalah ? "-" : `${fmtNum(exposure)}%`)}
		{@render metric(
			"Ruang sisa",
			ruangSisa === null ? "-" : `${fmtNum(ruangSisa)}%`,
			ruangSisa === 0 ? "text-[var(--warn)]" : ""
		)}
		{@render metric("Risiko serentak", serentak === null ? "-" : `${fmtNum(serentak)}%`)}
	</dl>
	<p class="text-muted mt-1 text-[11px] leading-snug">
		Risiko serentak turunan dari posisi terbuka x risiko per transaksi, bukan catatan.
	</p>

	{#if modalKosong}
		<p class="text-muted mt-2 text-[11px] leading-snug">
			Isi modal untuk melihat rupiah, lot, dan rugi maksimum. Tanpa modal, papan menampilkan
			persen saja.
		</p>
	{/if}
	{#if modalSalah || riskSalah}
		<p class="mt-2 text-[11px] leading-snug text-[var(--warn)]" role="status">
			Isi angka lebih dari 0.
		</p>
	{/if}
	{#if openSalah || eksposurSalah}
		<p class="mt-2 text-[11px] leading-snug text-[var(--warn)]" role="status">
			Isi angka 0 atau lebih.
		</p>
	{/if}
	<p class="text-muted mt-2 text-[11px] leading-snug">
		Ini risiko rencana, bukan jaminan kerugian maksimum harian: harga bisa melewati stop.
	</p>
</section>
