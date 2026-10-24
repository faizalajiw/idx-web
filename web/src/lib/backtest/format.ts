import type { CostModelInfo, CostSettings, StrategyInfo } from '#lib/types.ts';
import { PERIODS, type CostPct, type PeriodId, type Tone } from '#lib/backtest/constants.ts';

/** Persen bertanda: `+12,34%` / `-4,00%`. */
export function pct(v: number | null | undefined, digits = 2): string {
	if (v === null || v === undefined) return '-';
	return `${v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;
}

/** Persen tanpa tanda — dipakai saat tandanya sudah jelas dari label. */
export function pctMag(v: number | null | undefined, digits = 2): string {
	if (v === null || v === undefined) return '-';
	return `${(Math.abs(v) * 100).toFixed(digits)}%`;
}

export function decimals(v: number | null | undefined, digits = 2): string {
	if (v === null || v === undefined) return '-';
	return v.toFixed(digits);
}

export function toneOf(v: number | null | undefined): Tone {
	if (v === null || v === undefined || v === 0) return 'neutral';
	return v > 0 ? 'up' : 'down';
}

export function toneClass(tone?: Tone): string {
	if (tone === 'up') return 'text-up';
	if (tone === 'down') return 'text-down';
	return '';
}

export function costPctFromDefaults(d: CostModelInfo): CostPct {
	return {
		commission: d.commission_pct * 100,
		tax: d.sell_tax_pct * 100,
		slippage: d.slippage_pct * 100,
		adv: d.max_adv_pct * 100
	};
}

export function costsPayload(c: CostPct): CostSettings {
	return {
		commission_pct: c.commission / 100,
		sell_tax_pct: c.tax / 100,
		slippage_pct: c.slippage / 100,
		max_adv_pct: c.adv / 100
	};
}

export function costModelLabel(c: CostModelInfo): string {
	const asPct = (v: number) => `${+(v * 100).toFixed(3)}%`;
	return [
		`Komisi ${asPct(c.commission_pct)}/sisi`,
		`pajak jual ${asPct(c.sell_tax_pct)}`,
		`slippage ${asPct(c.slippage_pct)}/sisi`,
		`cap likuiditas ${asPct(c.max_adv_pct)} ADTV`
	].join(' · ');
}

export function defaultsFor(info: StrategyInfo): Record<string, number> {
	return Object.fromEntries(info.params.map((p) => [p.key, p.default]));
}

/** Tanggal mulai (YYYY-MM-DD) untuk periode terpilih; `undefined` = seluruh riwayat. */
export function periodStart(id: PeriodId): string | undefined {
	const months = PERIODS.find((p) => p.id === id)?.months ?? null;
	if (months === null) return undefined;
	const d = new Date();
	d.setMonth(d.getMonth() - months);
	return d.toISOString().slice(0, 10);
}
