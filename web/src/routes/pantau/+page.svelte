<script lang="ts">
	import { Bell } from '@lucide/svelte';
	import AlertRules from '#lib/components/AlertRules.svelte';
	import TechnicalChart from '#lib/components/TechnicalChart.svelte';
	import TelegramStatus from '#lib/components/TelegramStatus.svelte';
	import WatchlistTable from '#lib/components/WatchlistTable.svelte';
	import SmartMoneyWatchCard from '#lib/components/SmartMoneyWatchCard.svelte';

	/**
	 * Pantau = watchlist + notifikasi dalam satu tempat. Watchlist menggerakkan
	 * chart dan daftar emiten untuk pembuat aturan, jadi alur "pilih saham ->
	 * pasang batas -> tunggu Telegram" selesai tanpa pindah halaman.
	 */
	let selected = $state<string | null>(null);
</script>

<svelte:head>
	<title>Pantau & Notifikasi · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Bell size={26} class="text-accent" aria-hidden />
			Pantau & <span class="gradient-text">Notifikasi</span>
		</h1>
		<p class="text-muted mt-0.5 text-sm">
			Kelola watchlist, pasang batas harga/RSI/volume, lalu terima kabarnya di Telegram
		</p>
	</div>

	<div class="card p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
		<span class="font-semibold text-[var(--fg)]">Cara kerja: </span>
		aturan diperiksa setiap kali data EOD baru masuk. Notifikasi dikirim
		<span class="font-semibold text-[var(--fg)]">sekali per persilangan</span> — begitu kondisi terpenuhi,
		aturan itu “tersimpan aman” dan baru bisa bunyi lagi setelah kondisinya kembali normal. Jadi tidak
		ada spam tiap hari selama harga masih di atas batas.
	</div>

	<WatchlistTable onSelect={(code) => (selected = code)} {selected} />

	<TechnicalChart code={selected} />

	<SmartMoneyWatchCard />

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<AlertRules />
		<TelegramStatus />
	</div>
</main>
