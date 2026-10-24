<script lang="ts">
	import { useAlerts, useCreateAlert, useDeleteAlert, useWatchlist } from '#lib/hooks.svelte.ts';
	import { fmtNum, fmtPct } from '#lib/format.ts';
	import type { AlertRuleStatus, AlertRuleType, WatchlistRow } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	function fmtMetric(value: number | null, unit: string): string {
		if (value === null || value === undefined) return '-';
		if (unit === 'IDR') return fmtNum(value);
		if (unit === 'RSI') return value.toFixed(1);
		return `${value.toFixed(2)}×`;
	}

	function signalBadge(signal: string | null): string {
		if (signal === 'BUY') return 'badge badge-buy';
		if (signal === 'SELL') return 'badge badge-sell';
		return 'badge badge-hold';
	}

	function defaultThreshold(
		spec: AlertRuleType | undefined,
		rows: WatchlistRow[] | undefined,
		code: string
	): number {
		if (!spec) return 0;
		// Price levels are far more useful pre-filled with the current price.
		if (spec.unit === 'IDR' && code) {
			const row = rows?.find((r) => r.code === code);
			if (row?.close) return Math.round(row.close);
		}
		return spec.default;
	}

	const alerts = useAlerts();
	// Getter hook: baca lewat objek, lalu salin ke `$derived` agar tetap reaktif.
	const data = $derived(alerts.data);
	const error = $derived(alerts.error);
	const isLoading = $derived(alerts.isLoading);
	const watchlistQuery = useWatchlist();
	const watchlist = $derived(watchlistQuery.data);
	const addAlert = useCreateAlert();
	const removeAlert = useDeleteAlert();

	let code = $state<string | null>(null);
	let typeId = $state<string | null>(null);
	let threshold = $state<number | null>(null);
	let note = $state('');
	let busy = $state(false);
	let mutateError = $state<string | null>(null);

	const ruleTypes = $derived(data?.rule_types ?? []);
	const activeCode = $derived(code ?? watchlist?.[0]?.code ?? '');
	const activeType = $derived(typeId ?? ruleTypes[0]?.id ?? '');
	const spec = $derived(ruleTypes.find((t) => t.id === activeType));
	const effectiveThreshold = $derived(threshold ?? defaultThreshold(spec, watchlist, activeCode));

	const sortedRules = $derived.by(() => {
		const rules = data?.rules ?? [];
		return [...rules].sort((a, b) => a.code.localeCompare(b.code) || a.type.localeCompare(b.type));
	});

	async function handleAdd() {
		if (!activeCode || !activeType || busy) return;
		busy = true;
		mutateError = null;
		try {
			await addAlert({
				code: activeCode,
				type: activeType,
				threshold: effectiveThreshold,
				note: note.trim() || null
			});
			note = '';
			threshold = null;
		} catch (e) {
			mutateError = e instanceof Error ? e.message : 'Gagal menambah aturan';
		} finally {
			busy = false;
		}
	}

	async function handleRemove(id: string) {
		if (busy) return;
		busy = true;
		mutateError = null;
		try {
			await removeAlert(id);
		} catch (e) {
			mutateError = e instanceof Error ? e.message : 'Gagal menghapus aturan';
		} finally {
			busy = false;
		}
	}
</script>

{#snippet ruleRow(rule: AlertRuleStatus)}
	<tr>
		<td>
			<span class="font-semibold">{rule.code}</span>
			<span class="text-muted ml-2 text-xs tabular-nums">
				{fmtNum(rule.close)}
				{rule.percent !== null ? ` (${fmtPct(rule.percent)})` : ''}
			</span>
		</td>
		<td>
			<span class="text-sm">{rule.type_label}</span>
			{#if rule.note}<span class="text-muted ml-2 text-xs">· {rule.note}</span>{/if}
		</td>
		<td class="text-right tabular-nums">{fmtMetric(rule.threshold, rule.unit)}</td>
		<td class="text-right tabular-nums">{fmtMetric(rule.current, rule.unit)}</td>
		<td class="text-center">
			<span class={rule.triggered ? 'badge badge-warn' : 'badge badge-hold'}>
				{rule.triggered ? 'TERPICU' : 'menunggu'}
			</span>
		</td>
		<td class="py-2 text-right">
			<button
				type="button"
				onclick={() => void handleRemove(rule.id)}
				disabled={busy}
				title={`Hapus aturan ${rule.code} ${rule.type_label}`}
				aria-label={`Hapus aturan ${rule.code} ${rule.type_label}`}
				class="text-muted hover:text-down rounded px-1.5 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
			>
				×
			</button>
		</td>
	</tr>
{/snippet}

<Card
	title="Aturan Notifikasi"
	subtitle="Dikirim via Telegram sekali per persilangan ambang"
	info="Buat 'alarm' harga sendiri: pilih saham dan kondisinya (mis. harga tembus angka tertentu), lalu kamu diberi tahu via Telegram saat kondisi itu terjadi."
>
	{#snippet right()}
		{#if data}
			<span class={data.triggered_count > 0 ? 'badge badge-warn' : 'badge badge-hold'}>
				{data.triggered_count} terpicu
			</span>
		{/if}
	{/snippet}

	{#if error}
		<ErrorState
			message="Gagal memuat aturan: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else if isLoading || !data}
		<Skeleton class="h-56" />
	{:else}
		<div class="space-y-4">
			<!-- ------------------------------------------------------- builder -->
			{#if !watchlist?.length}
				<EmptyState message="Tambahkan emiten ke watchlist dulu, lalu pasang aturannya di sini." />
			{:else}
				<div class="space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<label class="block">
							<span class="text-muted text-xs">Emiten</span>
							<select
								class="input mt-1 w-full"
								value={activeCode}
								onchange={(e) => {
									code = e.currentTarget.value;
									threshold = null;
								}}
							>
								{#each watchlist as r (r.code)}
									<option value={r.code}>{r.code}</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-muted text-xs">Kondisi</span>
							<select
								class="input mt-1 w-full"
								value={activeType}
								onchange={(e) => {
									typeId = e.currentTarget.value;
									threshold = null;
								}}
							>
								{#each ruleTypes as t (t.id)}
									<option value={t.id}>{t.label}</option>
								{/each}
							</select>
						</label>
					</div>

					{#if spec}
						<p class="text-muted text-xs leading-relaxed">{spec.description}</p>
					{/if}

					<div class="grid grid-cols-2 gap-3">
						<label class="block">
							<span class="text-muted text-xs">
								Ambang ({spec?.unit === 'IDR' ? 'Rp' : (spec?.unit ?? '-')})
							</span>
							<input
								type="number"
								class="input mt-1 w-full"
								value={effectiveThreshold}
								min={spec?.min ?? undefined}
								max={spec?.max ?? undefined}
								step={spec?.step ?? 1}
								oninput={(e) => {
									const raw = e.currentTarget.value;
									const parsed = Number(raw);
									threshold = raw.trim() === '' || Number.isNaN(parsed) ? null : parsed;
								}}
							/>
						</label>
						<label class="block">
							<span class="text-muted text-xs">Catatan (opsional)</span>
							<input
								type="text"
								class="input mt-1 w-full"
								value={note}
								placeholder="mis. resistance"
								oninput={(e) => (note = e.currentTarget.value)}
							/>
						</label>
					</div>

					<button
						type="button"
						class="btn btn-primary w-full"
						onclick={() => void handleAdd()}
						disabled={busy || !activeCode || !activeType}
					>
						{busy ? 'Menyimpan…' : '+ Tambah aturan'}
					</button>
					{#if mutateError}<ErrorState message={mutateError} />{/if}
				</div>
			{/if}

			<!-- --------------------------------------------------------- list -->
			{#if sortedRules.length === 0}
				<EmptyState message="Belum ada aturan. Tambahkan satu di atas." />
			{:else}
				<div class="max-h-[380px] overflow-auto">
					<table class="data-table">
						<thead class="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
							<tr>
								<th class="text-left">Emiten</th>
								<th class="text-left">Kondisi</th>
								<th class="text-right">Ambang</th>
								<th class="text-right">Kini</th>
								<th class="text-center">Status</th>
								<th class="py-2 text-right">
									<span class="sr-only">Aksi</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedRules as rule (rule.id)}
								{@render ruleRow(rule)}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<p class="text-muted text-xs tabular-nums">
				Diperiksa {data.checked_at.slice(11, 16)} WIB · {sortedRules.length} aturan
				{#if sortedRules[0]?.signal}
					· sinyal {sortedRules[0].code}
					<span class={signalBadge(sortedRules[0].signal)}>{sortedRules[0].signal}</span>
				{/if}
			</p>
		</div>
	{/if}
</Card>
