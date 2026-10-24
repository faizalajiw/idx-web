<script lang="ts">
	import { Info } from '@lucide/svelte';
	import Card from '#lib/components/Card.svelte';
	import BacktestStat from '#lib/components/BacktestStat.svelte';
	import { fmtCompact } from '#lib/format.ts';
	import type { BacktestResult } from '#lib/types.ts';
	import { decimals, pct, toneClass, toneOf } from '#lib/backtest/format.ts';

	let {
		result,
		alpha,
		cadenceLabel
	}: {
		result: BacktestResult;
		alpha: number;
		cadenceLabel: string;
	} = $props();
</script>

<div class="space-y-4" role="tabpanel">
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<BacktestStat
			label="Keuntungan bersih"
			hint="Total perubahan modal setelah semua biaya dihitung."
			value={pct(result.metrics.total_return)}
			tone={toneOf(result.metrics.total_return)}
		/>
		<BacktestStat
			label="Selisih vs beli-tahan"
			hint="Seberapa jauh strategi mengalahkan (atau kalah dari) cara pasif beli lalu diamkan."
			value={pct(alpha)}
			tone={toneOf(alpha)}
		/>
		<BacktestStat
			label="Jatuh terdalam"
			hint="Penurunan terbesar dari titik tertinggi ke titik terendah selama uji."
			value={pct(-result.metrics.max_drawdown)}
			tone="down"
		/>
		<BacktestStat
			label="Imbal hasil per risiko"
			hint="Keuntungan dibanding naik-turunnya nilai. Makin tinggi makin efisien."
			value={decimals(result.metrics.sharpe)}
		/>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<div class="card p-4">
			<p class="text-muted text-xs">Modal akhir strategi</p>
			<p class="mt-1 text-xl font-bold tabular-nums">
				Rp {fmtCompact(result.metrics.final_equity)}
			</p>
			<p class="text-muted mt-2 text-xs">
				Dari modal awal Rp {fmtCompact(result.initial_cash)} →
				<span class={toneClass(toneOf(result.metrics.final_equity - result.initial_cash))}>
					{result.metrics.final_equity >= result.initial_cash ? 'untung' : 'rugi'} Rp
					{fmtCompact(Math.abs(result.metrics.final_equity - result.initial_cash))}
				</span>
			</p>
		</div>
		<div class="card p-4">
			<p class="text-muted text-xs">Yang diuji</p>
			<p class="mt-1 text-sm font-semibold">{result.strategy_name}</p>
			<p class="text-muted mt-2 text-xs leading-relaxed">
				{result.codes.length} emiten · {result.days} hari bursa ·
				{result.start} → {result.end} · susun ulang {cadenceLabel}
			</p>
		</div>
	</div>

	<Card title="Cara membaca hasil ini" subtitle="Agar tidak salah tafsir">
		<ul class="space-y-2 text-sm">
			<li class="flex gap-2">
				<Info size={16} class="text-muted mt-0.5 shrink-0" />
				<span class="min-w-0">
					<span class="font-semibold text-[var(--fg)]">Tanpa mengintip masa depan.</span>
					<span class="text-muted">
						Tiap hari simulasi hanya memakai harga dan data yang memang sudah ada saat itu.
					</span>
				</span>
			</li>
			<li class="flex gap-2">
				<Info size={16} class="text-muted mt-0.5 shrink-0" />
				<span class="min-w-0">
					<span class="font-semibold text-[var(--fg)]">
						Frekuensi susun-ulang itu pengungkit utama.
					</span>
					<span class="text-muted">
						Makin sering, makin besar biayanya. Coba bandingkan tab Biaya antar frekuensi.
					</span>
				</span>
			</li>
			<li class="flex gap-2">
				<Info size={16} class="text-muted mt-0.5 shrink-0" />
				<span class="min-w-0">
					<span class="font-semibold text-[var(--fg)]">Beli-tahan adalah tolok ukur.</span>
					<span class="text-muted">
						Kalau strategi kalah dari sekadar membeli lalu diam, strategi itu belum menambah nilai.
					</span>
				</span>
			</li>
			<li class="flex gap-2">
				<Info size={16} class="text-muted mt-0.5 shrink-0" />
				<span class="min-w-0">
					<span class="font-semibold text-[var(--fg)]">Ini simulasi, bukan janji.</span>
					<span class="text-muted">
						Hasil bagus di masa lalu tidak berarti bagus di masa depan.
					</span>
				</span>
			</li>
		</ul>
	</Card>
</div>
