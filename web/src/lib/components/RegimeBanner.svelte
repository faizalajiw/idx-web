<script lang="ts">
	import { MoveHorizontal, Shuffle, TrendingDown, TrendingUp, type LucideIcon } from "@lucide/svelte";
	import { useMarketRegime } from "#lib/hooks.svelte.ts";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import FreshnessBadge from "#lib/components/FreshnessBadge.svelte";

	/** Warna & ikon per regime. */
	const REGIME_STYLE: Record<string, { badge: string; icon: LucideIcon; label: string }> = {
		TRENDING_UP: { badge: "badge badge-buy", icon: TrendingUp, label: "Trending Up" },
		TRENDING_DOWN: { badge: "badge badge-sell", icon: TrendingDown, label: "Trending Down" },
		TRANSITION: { badge: "badge badge-warn", icon: Shuffle, label: "Transisi" },
		RANGING: { badge: "badge badge-hold", icon: MoveHorizontal, label: "Ranging" }
	};

	const VOL_STYLE: Record<string, { label: string; color: string }> = {
		VOLATILE: { label: "Volatil", color: "var(--warn)" },
		NORMAL: { label: "Normal", color: "var(--muted)" },
		QUIET: { label: "Tenang", color: "var(--up)" }
	};

	/** Saran taktis satu kalimat per regime — konteks baca sinyal, bukan sinyal. */
	function hint(regime: string | null): string | null {
		switch (regime) {
			case "TRENDING_UP":
				return "Sinyal BUY lebih layak diikuti; hindari kontra-tren.";
			case "TRENDING_DOWN":
				return "Sinyal BUY rawan gagal; prioritaskan proteksi modal.";
			case "TRANSITION":
				return "Kekuatan tren sedang — tunggu konfirmasi sebelum menambah posisi.";
			case "RANGING":
				return "Breakout rentan gagal; strategi band (beli lemah, jual kuat) lebih cocok.";
			default:
				return null;
		}
	}

	/**
	 * Banner konteks regime IHSG. Self-fetch lewat cache bersama — sekali ambil,
	 * dipakai semua halaman yang memasang banner ini.
	 */
	const regime = useMarketRegime();
	const data = $derived(regime.data);
</script>

{#if regime.error || (!regime.isLoading && !data?.regime)}
	<!-- Senyap bila tak tersedia. -->
{:else if regime.isLoading}
	<div class="card h-10 animate-pulse bg-white/[0.04]" aria-hidden="true"></div>
{:else if data}
	{@const style = REGIME_STYLE[data.regime ?? ""] ?? REGIME_STYLE.RANGING}
	{@const vol = data.vol_state ? VOL_STYLE[data.vol_state] : null}
	{@const RegimeIcon = style.icon}
	<div
		class="card flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
		title="ADX(14) + DI dari IHSG; volatilitas = realized vol 20 hari ter-annualisasi (~240 hari bursa)"
	>
		<span class="text-muted text-xs font-semibold tracking-widest uppercase">Kondisi IHSG</span>
		<span class={style.badge}>
			<RegimeIcon size={13} class="mr-1" aria-hidden /> {style.label}
			{data.adx !== null && ` · ADX ${data.adx}`}
		</span>
		{#if data.plus_di !== null && data.minus_di !== null}
			<span class="text-muted text-xs tabular-nums">
				DI +{data.plus_di} / −{data.minus_di}
			</span>
		{/if}
		{#if vol && data.realized_vol_annual !== null}
			<span class="text-xs tabular-nums" style="color: {vol.color}">
				Vol {vol.label} {data.realized_vol_annual}%
			</span>
		{/if}
		<span class="text-muted hidden text-xs md:inline">
			{hint(data.regime)}
		</span>
		{#if data.gate?.blocked || data.gate?.regime_fresh === false}
			<span class="text-xs font-medium" style="color: var(--warn)">
				{data.gate.reason}
			</span>
		{/if}
		<span class="ml-auto flex items-center gap-2">
			<FreshnessBadge basis="indeks" />
			<LastUpdated sessionDate={data.as_of} updatedAt={data.generated_at} />
		</span>
	</div>
{/if}
