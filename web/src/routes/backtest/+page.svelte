<script lang="ts">
	import { FlaskConical } from '@lucide/svelte';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EquityCurveChart from '#lib/components/EquityCurveChart.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';
	import RebalanceLedger from '#lib/components/RebalanceLedger.svelte';
	import RegimeBanner from '#lib/components/RegimeBanner.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import BacktestComparison from '#lib/components/BacktestComparison.svelte';
	import BacktestCosts from '#lib/components/BacktestCosts.svelte';
	import BacktestForm from '#lib/components/BacktestForm.svelte';
	import BacktestGlossary from '#lib/components/BacktestGlossary.svelte';
	import BacktestSummary from '#lib/components/BacktestSummary.svelte';
	import BacktestVerdict from '#lib/components/BacktestVerdict.svelte';
	import { TABS } from '#lib/backtest/constants.ts';
	import { BacktestState } from '#lib/backtest/state.svelte.ts';

	const bt = new BacktestState();

	const result = $derived(bt.result);
	const error = $derived(bt.error);
	const loading = $derived(bt.loading);
	const tab = $derived(bt.tab);
</script>

<svelte:head>
	<title>Backtest · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div class="min-w-0">
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<FlaskConical size={26} class="text-accent" aria-hidden="true" />
			Uji Strategi <span class="gradient-text">(Backtest)</span>
		</h1>
		<p class="text-muted mt-0.5 text-sm">
			Coba sebuah strategi di data masa lalu — seolah-olah kamu sudah menjalankannya sejak dulu —
			lalu lihat hasilnya setelah biaya nyata.
		</p>
	</div>

	<RegimeBanner />

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<div class="min-w-0 lg:col-span-1">
			<BacktestForm {bt} />
		</div>

		<div class="min-w-0 space-y-4 lg:col-span-2">
			{#if error}
				<ErrorState message={error} />
			{/if}

			{#if !result && !error}
				<Card
					title="2. Hasil"
					info="Hasil muncul di sini setelah kamu menekan “Jalankan Backtest”."
				>
					{#if loading}
						<div class="space-y-3">
							<Skeleton class="h-20" />
							<Skeleton class="h-72" />
						</div>
					{:else}
						<EmptyState
							message="Belum ada hasil. Pilih satu strategi di panel kiri, lalu tekan “Jalankan Backtest”."
						/>
					{/if}
				</Card>
			{/if}

			{#if result}
				<BacktestVerdict {result} alpha={bt.alpha} costErosion={bt.costErosion} />

				<div aria-label="Bagian hasil backtest" class="flex flex-wrap gap-2" role="tablist">
					{#each TABS as t (t.id)}
						{@const Icon = t.icon}
						{@const active = tab === t.id}
						<button
							type="button"
							role="tab"
							aria-selected={active}
							onclick={() => (bt.tab = t.id)}
							title={t.hint}
							class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {active
								? 'border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--fg)]'
								: 'text-muted border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'}"
						>
							<Icon size={16} />
							<span>{t.label}</span>
						</button>
					{/each}
				</div>

				{#if tab === 'ringkasan'}
					<BacktestSummary {result} alpha={bt.alpha} cadenceLabel={bt.cadenceLabel} />
				{/if}

				{#if tab === 'kurva'}
					<Card
						title="Kurva Modal"
						subtitle="{result.codes
							.length} emiten · {result.days} hari bursa · {result.start} → {result.end}"
						info="Grafik pertumbuhan modal dari waktu ke waktu. Garis naik = untung, turun = rugi. Perhatikan juga seberapa dalam jatuhnya, bukan cuma hasil akhirnya."
					>
						{#snippet right()}
							<LastUpdated dep={result} />
						{/snippet}
						<EquityCurveChart points={result.equity_curve} initialCash={result.initial_cash} />
					</Card>
				{/if}

				{#if tab === 'perbandingan'}
					<BacktestComparison {result} />
				{/if}

				{#if tab === 'biaya'}
					<BacktestCosts {result} costErosion={bt.costErosion} cadenceLabel={bt.cadenceLabel} />
				{/if}

				{#if tab === 'ledger'}
					<Card
						title="Jejak Transaksi"
						subtitle="Susun ulang {bt.cadenceLabel} · klik satu sesi untuk lihat pembelian &amp; penjualannya"
						info="Catatan setiap kali strategi menyusun ulang portofolio: saham apa yang dibeli/dijual dan berapa. Klik sebuah sesi untuk lihat detail transaksinya."
					>
						<RebalanceLedger
							events={result.rebalances}
							truncated={result.rebalances_truncated}
							total={result.total_rebalances}
						/>
					</Card>
				{/if}

				<p class="text-muted text-xs leading-relaxed">{result.disclaimer}</p>
			{/if}
		</div>
	</div>

	<BacktestGlossary />
</main>
