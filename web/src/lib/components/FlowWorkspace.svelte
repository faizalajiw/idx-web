<script lang="ts">
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { ArrowLeftRight, Search } from "@lucide/svelte";
	import { useWatchlist } from "#lib/hooks.svelte.ts";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ForeignFlowCard from "#lib/components/ForeignFlowCard.svelte";
	import FlowTimelineCard from "#lib/components/FlowTimelineCard.svelte";

	/**
	 * Isi halaman Aliran Dana Emiten: arah asing harian dan timeline skor
	 * akumulasi — keduanya untuk satu emiten. `code` null = tampil pemilih
	 * dengan empty state (deep-link /flow).
	 */
	let { code }: { code: string | null } = $props();

	const watchlist = useWatchlist();
	const codes = $derived((watchlist.data ?? []).map((w) => w.code));

	// Draft mengikuti URL saat emiten berganti dari luar (mis. chip / link).
	// Nilai awal cukup dibaca sekali; sinkronisasi berikutnya lewat effect.
	let draft = $state(untrack(() => code) ?? "");
	$effect(() => {
		draft = code ?? "";
	});

	// Emiten aktif tetap ditawarkan walau tidak ada di watchlist.
	const suggestions = $derived.by<string[]>(() => {
		const base = codes;
		const pool = code && !base.includes(code) ? [code, ...base] : base;
		const q = draft.trim().toUpperCase();
		if (!q) return pool.slice(0, 8);
		return pool.filter((c) => c.includes(q)).slice(0, 8);
	});

	function pick(event: SubmitEvent) {
		event.preventDefault();
		const next = draft.trim().toUpperCase();
		if (next) void goto(`/flow?code=${encodeURIComponent(next)}`);
	}
</script>

<svelte:head>
	<title>Aliran Dana Emiten · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
	<header class="space-y-1">
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<ArrowLeftRight size={26} class="text-accent" aria-hidden="true" />
			Aliran <span class="gradient-text">Dana Emiten</span>
		</h1>
		<p class="text-muted text-sm">
			Pilih satu saham untuk melihat apakah investor asing dan broker besar sedang mengumpulkan atau
			melepas saham tersebut.
		</p>
	</header>

	<div class="card space-y-3 p-4">
		<form class="flex flex-col gap-2 sm:flex-row sm:items-center" method="get" action="/flow" onsubmit={pick}>
			<div class="group relative flex-1">
				<Search
					size={16}
					aria-hidden="true"
					class="text-muted absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent-text)]"
				/>
				<input
					name="code"
					value={draft}
					oninput={(e) => (draft = e.currentTarget.value.toUpperCase())}
					placeholder="Ketik kode saham, mis. BBRI"
					class="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] pr-3 pl-10 text-sm font-medium tracking-wide outline-none transition-shadow focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
					aria-label="Kode emiten"
				/>
			</div>
			<button
				type="submit"
				class="h-11 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
			>
				Lihat
			</button>
		</form>
		{#if suggestions.length > 0}
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="text-muted text-[11px] font-medium">Cepat:</span>
				{#each suggestions as c (c)}
					<a
						href="/flow?code={c}"
						class="inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors {c ===
						code
							? 'border-[var(--accent)] bg-[var(--accent)] text-white'
							: 'border-[var(--border)] text-muted hover:bg-white/[0.06]'}"
					>
						{c}
					</a>
				{/each}
			</div>
		{/if}
	</div>

	{#if code}
		<div class="grid grid-cols-1 gap-4">
			<ForeignFlowCard {code} />
			<FlowTimelineCard {code} />
		</div>
	{:else}
		<EmptyState message="Belum ada emiten dipilih. Ketik kode di atas atau klik salah satu saran cepat." />
	{/if}
</main>
