<script lang="ts">
	import { Play, Settings2 } from '@lucide/svelte';
	import Card from '#lib/components/Card.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import InfoHint from '#lib/components/InfoHint.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { BacktestState } from '#lib/backtest/state.svelte.ts';
	import { COST_FIELDS, COST_PRESETS, PERIODS } from '#lib/backtest/constants.ts';
	import { costModelLabel } from '#lib/backtest/format.ts';

	let { bt }: { bt: BacktestState } = $props();

	const config = $derived(bt.config);
	const configError = $derived(bt.configError);
	const configLoading = $derived(bt.configLoading);
	const costPct = $derived(bt.costPct);
	const strategyId = $derived(bt.strategyId);
	const current = $derived(bt.current);
	const codelist = $derived(bt.codelist);
	const period = $derived(bt.period);
	const rebalance = $derived(bt.rebalance);
	const cash = $derived(bt.cash);
	const showAdvanced = $derived(bt.showAdvanced);
	const activeCostPreset = $derived(bt.activeCostPreset);
	const loading = $derived(bt.loading);
	const ready = $derived(bt.ready);
	const watchlist = $derived(bt.watchlist);
</script>

<Card
	title="1. Pilih Strategi"
	subtitle="Aturan beli-jual yang mau diuji"
	info="Backtest = uji strategi memakai data masa lalu. Ini simulasi untuk belajar; hasil masa lalu tidak menjamin masa depan."
>
	{#if configError}
		<ErrorState
			message="Gagal memuat konfigurasi: {configError instanceof Error
				? configError.message
				: String(configError)}"
		/>
	{:else if configLoading || !config || !costPct}
		<Skeleton class="h-72" />
	{:else}
		{@const cfg = config}
		{@const costs = costPct}
		<div class="space-y-5">
			<div class="space-y-2">
				{#each cfg.strategies as s (s.id)}
					{@const active = strategyId === s.id}
					<button
						type="button"
						onclick={() => bt.choose(s)}
						aria-pressed={active}
						class="card card-hover flex w-full items-start gap-3 p-3 text-left {active
							? 'ring-1 ring-[var(--accent)]'
							: ''}"
					>
						<span
							aria-hidden="true"
							class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border {active
								? 'border-[var(--accent)] bg-[var(--accent)]'
								: 'border-[var(--border-strong)]'}"
						>
							{#if active}<span class="h-1.5 w-1.5 rounded-full bg-white"></span>{/if}
						</span>
						<span class="min-w-0">
							<span class="text-sm font-semibold">{s.name}</span>
							<span class="text-muted mt-1 block text-xs leading-relaxed">{s.description}</span>
						</span>
					</button>
				{/each}
			</div>

			{#if current && current.params.length > 0}
				<div>
					<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
						Pengaturan strategi
					</p>
					<div class="grid grid-cols-2 gap-3">
						{#each current.params as p (p.key)}
							<label class="block min-w-0">
								<span class="text-muted text-xs">{p.label}</span>
								<input
									type="number"
									class="input mt-1 w-full"
									value={bt.params[p.key] ?? p.default}
									min={p.min ?? undefined}
									max={p.max ?? undefined}
									step={p.step}
									onchange={(e) => bt.handleParam(p.key, e.currentTarget.value)}
								/>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<div>
				<div class="mb-2 flex items-center justify-between gap-2">
					<p class="text-muted text-xs font-semibold tracking-wider uppercase">
						Emiten ({codelist.length}/{cfg.max_codes})
					</p>
					{#if watchlist?.length}
						<button
							type="button"
							class="text-muted text-xs underline decoration-dotted hover:text-[var(--fg)]"
							onclick={() => bt.useWatchlistForCodes()}
						>
							Pakai watchlist
						</button>
					{/if}
				</div>
				<textarea
					class="input w-full resize-y"
					rows={2}
					value={bt.codes}
					placeholder="BBCA, BBRI, TLKM"
					onchange={(e) => (bt.codes = e.currentTarget.value)}></textarea>
				<p class="text-muted mt-1 text-xs">
					Pisahkan dengan koma. Maksimal {cfg.max_codes} emiten.
				</p>
			</div>

			<div>
				<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">Rentang waktu</p>
				<div class="flex flex-wrap gap-2">
					{#each PERIODS as p (p.id)}
						<button
							type="button"
							aria-pressed={period === p.id}
							onclick={() => (bt.period = p.id)}
							class="chip {period === p.id ? 'chip-active' : ''}"
						>
							{p.label}
						</button>
					{/each}
				</div>
			</div>

			<button
				type="button"
				class="text-muted flex items-center gap-1 text-xs underline decoration-dotted hover:text-[var(--fg)]"
				aria-expanded={showAdvanced}
				onclick={() => (bt.showAdvanced = !showAdvanced)}
			>
				<Settings2 size={12} />
				{showAdvanced ? 'Sembunyikan pengaturan lanjutan' : 'Pengaturan lanjutan'}
			</button>

			{#if showAdvanced}
				<div class="space-y-5 border-l-2 border-[var(--border)] pl-3">
					<div>
						<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
							Seberapa sering portofolio disusun ulang
						</p>
						<div class="flex flex-wrap gap-2">
							{#each cfg.rebalance_options as option (option.id)}
								<button
									type="button"
									title={option.description}
									aria-pressed={rebalance === option.id}
									onclick={() => (bt.rebalance = option.id)}
									class="chip {rebalance === option.id ? 'chip-active' : ''}"
								>
									{option.label}
								</button>
							{/each}
						</div>
						<p class="text-muted mt-2 text-xs leading-relaxed">
							Di antara jadwal susun-ulang, posisi dibiarkan mengikuti pasar. Makin jarang, makin
							kecil biaya transaksinya.
						</p>
					</div>

					<label class="block min-w-0">
						<span class="text-muted text-xs">Modal awal (Rp)</span>
						<input
							type="number"
							class="input mt-1 w-full"
							value={cash}
							min={1_000_000}
							step={1_000_000}
							onchange={(e) => (bt.cash = Number(e.currentTarget.value) || 0)}
						/>
					</label>

					<div>
						<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
							Biaya &amp; likuiditas
						</p>
						<div class="flex flex-wrap gap-2">
							{#each COST_PRESETS as preset (preset.id)}
								<button
									type="button"
									title={preset.desc}
									aria-pressed={activeCostPreset === preset.id}
									onclick={() => (bt.costPct = preset.value)}
									class="chip {activeCostPreset === preset.id ? 'chip-active' : ''}"
								>
									{preset.label}
								</button>
							{/each}
						</div>
						<div class="mt-3 grid grid-cols-2 gap-3">
							{#each COST_FIELDS as f (f.key)}
								<label class="block min-w-0">
									<span class="text-muted flex items-center gap-1 text-xs">
										{f.label}
										<InfoHint text={f.hint} />
									</span>
									<input
										type="number"
										class="input mt-1 w-full"
										value={costs[f.key]}
										min={0}
										step={f.step}
										onchange={(e) => bt.handleCost(f.key, e.currentTarget.value)}
									/>
								</label>
							{/each}
						</div>
						<p class="text-muted mt-2 text-xs leading-relaxed">
							Model biaya: {costModelLabel(cfg.cost_defaults)}.
						</p>
					</div>
				</div>
			{/if}

			<div
				class="sticky bottom-0 -mx-4 border-t border-[var(--border)] bg-[var(--bg-elev)] px-4 pt-3 pb-1 sm:-mx-5 sm:px-5"
			>
				<button
					type="button"
					class="btn btn-primary flex w-full items-center justify-center gap-2"
					onclick={() => void bt.onRun()}
					disabled={!ready}
				>
					<Play size={16} />
					{loading ? 'Menghitung...' : 'Jalankan Backtest'}
				</button>
				<p class="text-muted mt-2 text-center text-xs">
					{#if !strategyId}
						Pilih satu strategi dulu di atas.
					{:else if codelist.length === 0}
						Isi minimal satu kode emiten.
					{:else}
						{codelist.length} emiten · {PERIODS.find((p) => p.id === period)?.label}
					{/if}
				</p>
			</div>
		</div>
	{/if}
</Card>
