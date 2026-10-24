<script lang="ts">
	import { fmtCompact, fmtNum } from '#lib/format.ts';
	import type { RebalanceEvent } from '#lib/types.ts';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';

	/**
	 * Jejak transaksi: pilih satu sesi rebalance di kiri, periksa fill yang
	 * dijalankannya dan buku yang ditinggalkannya. Event datang terbaru-dulu
	 * dari API.
	 */
	let {
		events,
		truncated,
		total
	}: { events: RebalanceEvent[]; truncated: boolean; total: number } = $props();

	let selected = $state(0);

	// Jaga indeks basi saat hasil baru (lebih pendek) masuk.
	const index = $derived(Math.min(selected, events.length - 1));
	const active = $derived(events[index]);
	const holdingsValue = $derived(active?.holdings.reduce((sum, h) => sum + h.value, 0) ?? 0);
</script>

{#snippet sideBadge(side: string)}
	<span class={side === 'buy' ? 'badge badge-buy' : 'badge badge-sell'}>
		{side === 'buy' ? 'BELI' : 'JUAL'}
	</span>
{/snippet}

{#if events.length === 0}
	<EmptyState
		message="Tidak ada rebalance di periode ini — strategi tidak pernah menyesuaikan posisi."
	/>
{:else if active}
	{@const book = holdingsValue + active.cash}
	<div class="space-y-3">
		{#if truncated}
			<p class="text-muted text-xs leading-relaxed">
				Menampilkan <span class="font-medium text-[var(--fg)]">{events.length}</span> rebalance
				terbaru dari total {total}. Angka agregat (turnover &amp; biaya) di kartu lain tetap
				lengkap.
			</p>
		{/if}

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- ------------------------------------------------- sesi rebalance -->
			<div class="max-h-[380px] space-y-1 overflow-y-auto pr-1 lg:col-span-1">
				{#each events as event, i (event.date)}
					{@const isActive = i === index}
					<button
						type="button"
						onclick={() => (selected = i)}
						aria-current={isActive ? 'true' : undefined}
						class="w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors {isActive
							? 'border-[var(--accent)] bg-white/[0.04]'
							: 'border-[var(--border)] hover:border-[var(--border-strong)]'}"
					>
						<div class="flex items-baseline justify-between gap-2">
							<span class="font-semibold tabular-nums">{event.date}</span>
							<span class="text-muted tabular-nums">{event.trades.length} trade</span>
						</div>
						<div class="text-muted mt-0.5 flex items-baseline justify-between gap-2 tabular-nums">
							<span>Turnover {fmtCompact(event.turnover)}</span>
							<span>Fee {fmtCompact(event.fees)}</span>
						</div>
					</button>
				{/each}
			</div>

			<!-- --------------------------------------------------------- detail -->
			<div class="space-y-4 lg:col-span-2">
				<div>
					<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
						Trade · {active.date}
					</p>
					{#if active.trades.length === 0}
						<p class="text-muted text-sm">Tidak ada trade — bobot posisi sudah sesuai target.</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="data-table">
								<thead>
									<tr>
										<th class="text-left">Kode</th>
										<th class="text-center">Aksi</th>
										<th class="text-right">Lembar</th>
										<th class="text-right">Harga</th>
										<th class="text-right">Nilai</th>
										<th class="text-right">Fee</th>
									</tr>
								</thead>
								<tbody>
									{#each active.trades as t, i (`${t.code}-${t.side}-${i}`)}
										<tr>
											<td class="font-semibold">
												<span class="inline-flex items-center gap-2">
													<TickerLogo code={t.code} size={18} />
													{t.code}
												</span>
											</td>
											<td class="text-center">{@render sideBadge(t.side)}</td>
											<td class="text-right tabular-nums">{fmtNum(t.shares, 2)}</td>
											<td class="text-right tabular-nums">{fmtNum(t.price, 2)}</td>
											<td class="text-right tabular-nums">{fmtCompact(t.notional)}</td>
											<td class="text-muted text-right tabular-nums">{fmtCompact(t.fee)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>

				<div>
					<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
						Posisi setelah rebalance
					</p>
					{#if active.holdings.length === 0}
						<p class="text-muted text-sm">Seluruh posisi dilikuidasi — buku 100% kas.</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="data-table">
								<thead>
									<tr>
										<th class="text-left">Kode</th>
										<th class="text-right">Lembar</th>
										<th class="text-right">Harga</th>
										<th class="text-right">Nilai</th>
										<th class="text-right">Bobot</th>
									</tr>
								</thead>
								<tbody>
									{#each active.holdings as h (h.code)}
										{@const weight = book > 0 ? (h.value / book) * 100 : 0}
										<tr>
											<td>
												<span class="inline-flex items-center gap-2">
													<TickerLogo code={h.code} size={18} />
													<span class="font-semibold">{h.code}</span>
												</span>
											</td>
											<td class="text-right tabular-nums">{fmtNum(h.shares, 2)}</td>
											<td class="text-right tabular-nums">{fmtNum(h.price, 2)}</td>
											<td class="text-right font-semibold tabular-nums">{fmtCompact(h.value)}</td>
											<td class="text-muted text-right tabular-nums">{weight.toFixed(1)}%</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
					<p class="text-muted mt-2 text-xs tabular-nums">
						Kas {fmtCompact(active.cash)} · nilai buku {fmtCompact(book)} · turnover sesi ini
						{fmtCompact(active.turnover)}
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}
