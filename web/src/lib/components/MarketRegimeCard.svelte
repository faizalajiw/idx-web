<script lang="ts">
	import {
		Activity,
		MoveHorizontal,
		Shuffle,
		TrendingDown,
		TrendingUp,
		type LucideIcon
	} from "@lucide/svelte";
	import { useMarketRegime, useRegimeHistory } from "#lib/hooks.svelte.ts";
	import Card from "#lib/components/Card.svelte";
	import FreshnessBadge from "#lib/components/FreshnessBadge.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";

	/** Ikon & warna per regime. */
	const REGIME: Record<
		string,
		{ icon: LucideIcon; label: string; desc: string; badge: string; color: string }
	> = {
		TRENDING_UP: {
			icon: TrendingUp,
			label: "Tren Naik",
			desc: "IHSG lagi naik cukup konsisten — kondisi biasanya lebih ramah buat beli/bertahan.",
			badge: "badge badge-buy",
			color: "var(--up)"
		},
		TRENDING_DOWN: {
			icon: TrendingDown,
			label: "Tren Turun",
			desc: "IHSG lagi turun cukup konsisten — hati-hati, sinyal beli rawan gagal. Prioritaskan melindungi modal.",
			badge: "badge badge-sell",
			color: "var(--down)"
		},
		TRANSITION: {
			icon: Shuffle,
			label: "Transisi",
			desc: "Pasar sedang bingung / ganti arah — tunggu konfirmasi dulu sebelum menambah posisi.",
			badge: "badge badge-warn",
			color: "#fbbf24"
		},
		RANGING: {
			icon: MoveHorizontal,
			label: "Menyamping",
			desc: "Harga cenderung naik-turun di rentang sempit — strategi beli di rendah, jual di tinggi lebih cocok.",
			badge: "badge badge-hold",
			color: "var(--fg-muted)"
		}
	};

	/** Label & warna volatilitas, plus arti buat user awam. */
	const VOL: Record<string, { label: string; short: string; color: string; desc: string }> = {
		QUIET: {
			label: "Tenang",
			short: "Perubahan harga kecil-kecil",
			color: "var(--up)",
			desc: "Harga stabil, jarang melonjak atau anjlok drastis."
		},
		NORMAL: {
			label: "Normal",
			short: "Perubahan harga wajar",
			color: "var(--muted)",
			desc: "Volatilitas pasar dalam kondisi standar/sewajarnya."
		},
		VOLATILE: {
			label: "Sangat Bergejolak",
			short: "Perubahan harga besar & cepat",
			color: "var(--warn)",
			desc: "Harga sering melonjak/anjlok — risikonya lebih tinggi, gerak pasar sulit ditebak."
		}
	};

	const REGIME_COLOR: Record<string, string> = {
		TRENDING_UP: "var(--up)",
		TRENDING_DOWN: "var(--down)",
		TRANSITION: "#fbbf24",
		RANGING: "var(--fg-muted)"
	};

	/** ADX: kekuatan tren. 0-25 lemah, 25-50 sedang, 50+ kuat. */
	function trendTag(adx: number | null): { label: string; color: string } | null {
		if (adx == null) return null;
		if (adx < 20) return { label: "Tren lemah (belum jelas arahnya)", color: "var(--muted)" };
		if (adx < 40) return { label: "Tren sedang", color: "var(--up)" };
		return { label: "Tren kuat", color: "var(--up)" };
	}

	const regime = useMarketRegime();
	const hist = useRegimeHistory(60);

	const data = $derived(regime.data);
	const error = $derived(regime.error);
	const isLoading = $derived(regime.isLoading);
	const history = $derived(hist.data);

	const style = $derived(REGIME[data?.regime ?? ""] ?? REGIME.RANGING);
	const vol = $derived(data?.vol_state ? (VOL[data.vol_state] ?? null) : null);
	const trend = $derived(trendTag(data?.adx ?? null));
</script>

{#if error || (!isLoading && (!data || !data.regime))}
	<Card title="Suasana Pasar" subtitle="Status tren & volatilitas IHSG">
		{#snippet right()}
			<span class="flex items-center gap-2">
				<FreshnessBadge basis="indeks" />
				<LastUpdated sessionDate={data?.as_of} updatedAt={data?.generated_at} />
			</span>
		{/snippet}
		<p class="text-muted text-sm">Data kondisi IHSG belum tersedia.</p>
	</Card>
{:else if isLoading || !data}
	<div class="card h-24 animate-pulse bg-white/[0.04]" aria-hidden="true"></div>
{:else}
	{@const RegimeIcon = style.icon}
	{@const rd = data}
	<Card
		title="Suasana Pasar"
		subtitle="Ringkasan tren & volatilitas IHSG (kondisi IHSG)"
		info="'Suasana pasar' (kondisi IHSG) = kondisi umum IHSG dari data historis: sedang naik, turun, atau menyamping. Timeline di bawah menunjukkan suasana tiap hari bursa 60 hari terakhir — warnanya mengikuti kondisi harian. Volatilitas = seberapa besar & cepat pergerakan harga."
	>
		{#snippet right()}
			<span class="flex items-center gap-2">
				<FreshnessBadge basis="indeks" />
				<LastUpdated sessionDate={rd.as_of} updatedAt={rd.generated_at} />
			</span>
		{/snippet}

		<div class="flex flex-col gap-4">
			{#if rd.gate && (rd.gate.blocked || rd.gate.regime_fresh === false)}
				<p class="text-xs font-medium" style="color: var(--warn)">
					{rd.gate.reason}
				</p>
			{/if}

			<div class="flex flex-wrap items-center gap-3">
				<span class="badge text-sm {style.badge}">
					<RegimeIcon size={14} class="mr-1" aria-hidden="true" />
					{style.label}
				</span>
				{#if rd.adx != null && trend}
					<span
						class="text-xs font-medium tabular-nums"
						style="color: {trend.color}"
						title={`ADX ${rd.adx}`}
					>
						{trend.label} · ADX {rd.adx}
					</span>
				{/if}
				<span class="text-muted text-xs tabular-nums">
					DI +{rd.plus_di ?? "-"} / −{rd.minus_di ?? "-"}
				</span>
			</div>

			<p class="text-muted -mt-1 text-sm leading-relaxed">{style.desc}</p>

			{#if vol}
				<div class="rounded-lg border border-[var(--border)] px-4 py-3">
					<div class="flex flex-wrap items-center gap-2">
						<Activity size={14} aria-hidden="true" style="color: {vol.color}" />
						<span class="text-xs font-semibold tracking-widest uppercase">Volatilitas</span>
						<span
							class="badge tabular-nums"
							style="color: {vol.color}; border-color: {vol.color}; background: transparent"
						>
							{vol.label}
						</span>
						{#if rd.realized_vol_annual != null}
							<span class="text-xs tabular-nums" style="color: {vol.color}">
								{rd.realized_vol_annual}% / tahun
							</span>
						{/if}
					</div>
					<p class="text-muted mt-1.5 text-xs leading-relaxed">{vol.desc}</p>
				</div>
			{/if}

			<div>
				<p class="mb-1.5 text-xs font-medium text-[var(--fg-muted)]">
					60 hari bursa terakhir — {rd.as_of ? `sampai ${rd.as_of}` : ""}
				</p>
				{#if hist.isLoading || !history}
					<div class="h-8 animate-pulse rounded bg-white/[0.04]"></div>
				{:else}
					<div class="flex gap-[2px] overflow-hidden" role="img" aria-label="Timeline kondisi IHSG">
						{#each history.recent.slice(-60) as d (d.date)}
							{@const color = REGIME_COLOR[d.regime ?? ""] ?? "var(--border)"}
							{@const hot = (d.realized_vol ?? 0) >= 30}
							{@const timelineStyle = `background: ${color}; opacity: ${hot ? 1 : 0.55};${hot ? " outline: 1px solid rgba(251,191,36,.7);" : ""}`}
							<div
								title={`${d.date} · ${d.regime ?? "-"} · ADX ${d.adx ?? "-"} · vol ${d.realized_vol ?? "-"}%`}
								class="h-8 flex-1 rounded-sm transition-transform hover:scale-y-125"
								style={timelineStyle}
							></div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Card>
{/if}
