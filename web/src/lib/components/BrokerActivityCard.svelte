<script lang="ts">
	import { useStockBrokerActivity } from "#lib/hooks.svelte.ts";
	import type {
		BrokerActivityDriver,
		BrokerActivitySector,
		StockBrokerActivity
	} from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import LineArea from "#lib/components/LineArea.svelte";

	const SCORE_LINE = "var(--chart-score)";

	/** Berapa sesi riwayat driver yang ditampilkan di daftar (bukan di chart). */
	const DRIVER_ROWS = 10;

	function scoreTone(score: number): string {
		if (score >= 60) return "var(--up)";
		if (score <= 40) return "var(--down)";
		return "var(--accent)";
	}

	const p0 = (v: number) => `${(v * 100).toFixed(0)}%`;

	function vsMedianText(
		self: { score: number } | undefined,
		median: number | null
	): string {
		if (!self || median === null) return "";
		if (self.score > median) return " — di atas median sektor";
		if (self.score < median) return " — di bawah median sektor";
		return " — tepat di median sektor";
	}

	let { code }: { code: string } = $props();

	const activity = useStockBrokerActivity(() => code);
	const data = $derived(activity.data);
</script>

<!--
	Chip driver: tanda menunjukkan arah dorongan ke skor (bukan arah harga).
-->
{#snippet driverChips(drivers: BrokerActivityDriver[])}
	{#if drivers.length === 0}
		<span class="text-muted text-xs">—</span>
	{:else}
		<div class="flex flex-wrap gap-1">
			{#each drivers as d (d.factor)}
				<span class="badge badge-hold gap-1 whitespace-nowrap">
					<span class={d.contribution >= 0 ? "text-up" : "text-down"}>
						{d.contribution >= 0 ? "▲" : "▼"}
					</span>
					{d.label}
					{#if d.percentile !== null}
						<span class="text-muted tabular-nums">{p0(d.percentile)}</span>
					{/if}
				</span>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet currentScore(d: StockBrokerActivity)}
	{@const cur = d.current}
	{#if !cur}
		<p class="text-muted text-xs">
			Tidak ada skor untuk sesi terakhir — coverage faktor emiten ini di bawah ambang hari ini.
		</p>
	{:else}
		<div>
			<div class="flex items-baseline justify-between text-xs">
				<span class="text-muted">Skor akumulasi</span>
				<span class="font-semibold tabular-nums" style="color: {scoreTone(cur.score)}">
					{cur.score.toFixed(0)}/100
				</span>
			</div>
			<div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full rounded-full transition-all"
					style="width: {Math.max(0, Math.min(100, cur.score))}%; background: {scoreTone(cur.score)}"
				></div>
			</div>
			<p class="text-muted mt-1 text-[11px] tabular-nums">
				Peringkat {cur.rank} dari {cur.universe} emiten · persentil pasar {p0(cur.percentile)} · coverage
				faktor {p0(cur.coverage)}
			</p>
			<div class="mt-2">
				{@render driverChips(cur.drivers)}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet scoreHistory(d: StockBrokerActivity)}
	{@const pts = d.history}
	<!-- Satu titik tidak membentuk garis; biarkan CurrentScore yang bicara. -->
	{#if pts.length >= 2}
		<div>
			<p class="text-muted mb-1 text-[11px]">
				Riwayat skor — tiap titik diukur terhadap pasar hari itu (garis putus-putus = median pasar)
			</p>
			<LineArea
				labels={pts.map((h) => h.date)}
				series={[
					{
						name: "Skor",
						values: pts.map((h) => h.score),
						color: SCORE_LINE,
						width: 2,
						fmt: (v) => v.toFixed(1)
					}
				]}
				height={140}
				yDomain={[0, 100]}
				yTicks={[0, 50, 100]}
				yFmt={(v) => String(Math.round(v))}
				xFmt={(s) => s.slice(5)}
				refs={[{ y: 50, color: "var(--chart-ref)", dashed: true }]}
				legend={false}
				xTickGap={24}
			/>
		</div>
	{/if}
{/snippet}

{#snippet sectorComparison(sector: BrokerActivitySector)}
	{@const self = sector.peers.find((p) => p.is_self)}
	{#if !sector.comparable}
		<p class="text-muted text-[11px] leading-snug">
			Emiten ini belum dipetakan ke sektor spesifik (masuk bucket
			&ldquo;{sector.name}&rdquo;), jadi skornya tidak dibandingkan dengan emiten lain: bucket itu menampung
			emiten dari berbagai sektor, sehingga perbandingannya tidak berarti.
		</p>
	{:else}
		<div>
			<div class="flex items-baseline justify-between gap-2 text-[11px]">
				<span class="text-muted">
					Sektor <span class="font-medium text-[var(--fg)]">{sector.name}</span>
				</span>
				{#if sector.my_rank !== null}
					<span class="text-muted tabular-nums">
						peringkat {sector.my_rank} dari {sector.peer_count}
					</span>
				{/if}
			</div>

			{#if self && sector.median_score !== null}
				<p class="text-muted mt-0.5 text-[11px] tabular-nums">
					Skor {self.score.toFixed(0)} vs median sektor {sector.median_score.toFixed(0)}
					{vsMedianText(self, sector.median_score)}
				</p>
			{/if}

			<ul class="mt-2 space-y-0.5">
				{#each sector.peers as p, i (p.code)}
					<li
						class="flex items-center gap-2 rounded px-1.5 py-1 text-[11px] {p.is_self
							? 'bg-white/[0.06] ring-1 ring-[var(--accent)]'
							: ''}"
						title={p.name ?? p.code}
					>
						<!-- Daftar sudah urut skor turun -> indeks + 1 = peringkat sektor. -->
						<span class="text-muted w-4 shrink-0 text-right tabular-nums">{i + 1}</span>
						<span class="w-14 shrink-0 truncate font-semibold">{p.code}</span>
						<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
							<div
								class="h-full rounded-full"
								style="width: {Math.max(0, Math.min(100, p.score))}%; background: {scoreTone(p.score)}"
							></div>
						</div>
						<span
							class="w-7 shrink-0 text-right font-semibold tabular-nums"
							style="color: {scoreTone(p.score)}"
						>
							{p.score.toFixed(0)}
						</span>
					</li>
				{/each}
			</ul>

			{#if !self && sector.my_rank !== null}
				<p class="text-muted mt-1.5 text-[11px]">
					Emiten ini (peringkat {sector.my_rank}) di luar {sector.peers.length} besar daftar yang
					ditampilkan.
				</p>
			{/if}

			<p class="text-muted mt-1.5 text-[11px] leading-snug">
				Hanya emiten sektor ini yang <em>sudah</em> punya skor yang ikut dibandingkan — yang belum punya skor
				tidak dihitung sebagai nol.
			</p>
		</div>
	{/if}
{/snippet}

{#snippet driverHistory(d: StockBrokerActivity)}
	{@const recent = [...d.history].reverse().slice(0, DRIVER_ROWS)}
	{#if recent.length > 0}
		<div>
			<p class="text-muted mb-1.5 text-[11px]">Driver terakhir ({recent.length} sesi)</p>
			<ul class="space-y-1.5">
				{#each recent as h (h.date)}
					<li class="border-b border-[var(--border)] pb-1.5">
						<div class="flex items-center justify-between text-[11px] tabular-nums">
							<span class="text-muted">{h.date}</span>
							<span class="font-semibold" style="color: {scoreTone(h.score)}">{h.score.toFixed(0)}</span>
						</div>
						<div class="mt-1">
							{@render driverChips(h.drivers)}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

{#snippet body(d: StockBrokerActivity)}
	{#if !d.validated}
		<div class="space-y-2">
			<p class="text-muted text-sm">{d.reason ?? "Skor aktivitas broker belum tervalidasi."}</p>
			<p class="text-muted text-[11px] leading-snug">
				Skor hanya dihitung dari faktor aliran yang sudah lolos uji statistik (IC), jadi selama belum ada yang
				lolos bagian ini sengaja dikosongkan alih-alih menampilkan angka tanpa dasar.
			</p>
		</div>
	{:else if !d.current && d.history.length === 0}
		<EmptyState
			message="Belum ada skor untuk emiten ini — data aliran belum cukup (butuh ≥ 21 hari)."
		/>
	{:else}
		<div class="space-y-4">
			{@render currentScore(d)}
			{#if d.sector}{@render sectorComparison(d.sector)}{/if}
			{@render scoreHistory(d)}
			{@render driverHistory(d)}
		</div>
	{/if}
{/snippet}

<!--
	Skor aktivitas broker satu emiten + riwayat driver-nya.
	Skor terkini identik dengan angka di halaman Aktivitas Broker; riwayatnya
	dihitung per tanggal terhadap pasar hari itu, jadi pergerakan garisnya benar
	(bukan pergeseran percentile pasar hari ini).
-->
<Card
	title="Aktivitas Broker"
	subtitle="Skor proksi aliran terkuat + riwayat driver-nya"
	info="Skor 0-100 dari aliran asing bernotasi + ketimpangan buku intraday, dibobot oleh uji IC. 50 = median pasar. Skor dipakai ulang oleh Screener dan Ruang Keputusan, jadi angkanya konsisten antar halaman. Pembanding sektor memakai emiten sektor yang sama yang sudah punya skor."
>
	{#snippet right()}
		<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />
	{/snippet}

	{#if activity.error}
		<ErrorState
			message="Gagal memuat aktivitas broker: {activity.error instanceof Error
				? activity.error.message
				: String(activity.error)}"
		/>
	{:else if activity.isLoading || !data}
		<Skeleton class="h-40 w-full" />
	{:else}
		{@render body(data)}
	{/if}
</Card>
