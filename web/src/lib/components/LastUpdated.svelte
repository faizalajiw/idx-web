<script lang="ts">
	import { RefreshCw } from "@lucide/svelte";
	import { fmtDateTime, fmtDateStr, fmtTimeStr } from "#lib/format.ts";

	/**
	 * Badge "update terakhir". Prioritas tampil:
	 *   1. `sessionDate` (tanggal sesi bursa) + `updatedAt` (jam capture backend).
	 *   2. Bila keduanya kosong, jam browser saat data diterima — dilabeli
	 *      "dimuat" agar tidak dikira waktu bursa.
	 */
	let {
		dep,
		sessionDate = null,
		updatedAt = null
	}: {
		dep?: unknown;
		sessionDate?: string | null;
		updatedAt?: string | null;
	} = $props();

	let at = $state<Date | null>(null);
	let previous: unknown = undefined;

	$effect(() => {
		if (dep !== undefined && dep !== previous) {
			previous = dep;
			at = new Date();
		}
	});

	const sesi = $derived(fmtDateStr(sessionDate));
	const jam = $derived(fmtTimeStr(updatedAt));
</script>

<!--
	Ada timestamp server: tampilkan tanggal bursa + jam refresh backend.
	Fallback: tak ada timestamp server, tampilkan jam browser saat data dimuat.
-->
{#if sesi || jam}
	<span
		class="text-muted inline-flex items-center gap-1 text-[11px] tabular-nums"
		title="Tanggal sesi bursa data ini, dan jam terakhir backend memperbaruinya (bukan jam browser)"
	>
		<RefreshCw size={11} aria-hidden />
		{sesi && `Sesi bursa ${sesi}`}
		{sesi && jam && " · "}
		{jam && `diperbarui ${jam}`}
	</span>
{:else if at}
	<span
		class="text-muted inline-flex items-center gap-1 text-[11px] tabular-nums"
		title="Waktu data terakhir dimuat di layar (jam browser, bukan waktu bursa)"
	>
		<RefreshCw size={11} aria-hidden />
		Dimuat {fmtDateTime(at)}
	</span>
{/if}
