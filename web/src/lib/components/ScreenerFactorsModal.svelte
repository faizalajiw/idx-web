<script lang="ts">
	import { X } from "@lucide/svelte";

	/** Faktor yang dipakai screener — daftar dari halaman Next, teks apa adanya. */
	const FACTORS: [string, string][] = [
		["Signal teknikal", "Rule SMA20/50 + RSI(14) — sama dengan panel Trading Signals."],
		["Momentum 20 hari", "Perubahan harga 20 hari bursa terakhir (%)."],
		["RSI(14)", "Kelebihanbelian relatif; <35 oversold, >70 overbought."],
		["Volume ratio", "Volume hari ini ÷ rata-rata 20 hari. >2 = aktivitas menonjol."],
		[
			"ATR%",
			"ATR(14) sebagai % dari close — volatilitas komparabel antar emiten. Tinggi = lebih berisiko."
		],
		[
			"Jarak 52w",
			"Posisi harga vs puncak 52 minggu (%). 0% = sedang di puncak; jauh di bawah = momentum lemah."
		],
		[
			"Hari sejak sinyal",
			"Hari bursa sejak BUY/SELL terakhir. Besar = sinyal sudah tua; 0-5 = sinyal baru."
		],
		[
			"Skor aktivitas broker",
			"Skor 0-100 dari aliran asing bernotasi rupiah + ketimpangan buku intraday, dibobot oleh uji IC. 50 = median pasar. Butuh run `idx ic` di backend dulu; sebelum itu kolomnya kosong dan filter menyaring semua."
		],
		[
			"Order-book imbalance",
			"Ketimpangan bid vs offer dari snapshot intraday (-1..1). Positif = bid lebih tebal — akumulasi diam-diam; negatif = offer tebal — distribusi."
		],
		[
			"Absorption",
			"Buku vs arah harga (-1..1). Negatif = offer tebal tapi harga tetap naik — buyer kuat menyerap (bullish)."
		],
		["Foreign net", "Net buy/sell asing hari terakhir (Rp, notional = lembar × close)."],
		["Likuiditas", "Nilai transaksi harian — filter minimal untuk hindari saham 'oleh-oleh'."]
	];

	let { onClose }: { onClose: () => void } = $props();

	let closeRef = $state<HTMLButtonElement | undefined>(undefined);

	$effect(() => {
		const prevOverflow = document.body.style.overflow;
		const prevFocus = document.activeElement as HTMLElement | null;
		document.body.style.overflow = "hidden";
		closeRef?.focus();
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = prevOverflow;
			prevFocus?.focus();
		};
	});
</script>

<div
	role="dialog"
	aria-modal="true"
	aria-labelledby="factors-title"
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
>
	<!-- Latar gelap: tombol penuh layar, di luar urutan Tab. -->
	<button
		type="button"
		tabindex="-1"
		aria-label="Tutup"
		onclick={onClose}
		class="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
	></button>
	<div
		class="relative flex max-h-[85vh] w-[min(640px,100%)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl animate-[popIn_180ms_ease-out]"
	>
		<header class="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
			<div>
				<h3 id="factors-title" class="text-base font-semibold tracking-tight">Faktor yang dihitung</h3>
				<p class="mt-0.5 text-xs text-[var(--fg-muted)]">
					{FACTORS.length} faktor · dipakai untuk menyaring dan mengurutkan saham
				</p>
			</div>
			<button
				bind:this={closeRef}
				type="button"
				onclick={onClose}
				aria-label="Tutup"
				class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--fg-muted)] transition hover:bg-[var(--bg-elev)] hover:text-[var(--fg)]"
			>
				<X size={16} aria-hidden="true" />
			</button>
		</header>
		<ul class="overflow-y-auto divide-y divide-[var(--border)] p-2">
			{#each FACTORS as [k, v] (k)}
				<li class="rounded-xl px-3 py-3">
					<p class="text-sm font-medium text-[var(--fg)]">{k}</p>
					<p class="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{v}</p>
				</li>
			{/each}
		</ul>
	</div>
</div>
