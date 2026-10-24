import { ChartColumn, ChartLine, Coins, ScrollText, Trophy, type LucideIcon } from '@lucide/svelte';

/** Pilihan rentang waktu; `months: null` berarti seluruh riwayat yang tersedia. */
export const PERIODS = [
	{ id: '6M', label: '6 Bulan', months: 6 },
	{ id: '1Y', label: '1 Tahun', months: 12 },
	{ id: '3Y', label: '3 Tahun', months: 36 },
	{ id: 'ALL', label: 'Semua', months: null }
] as const;

export type PeriodId = (typeof PERIODS)[number]['id'];

export type Tone = 'up' | 'down' | 'neutral';

/** Knob biaya dalam persen di UI; API menerima pecahan (0,0015 = 0,15%). */
export type CostPct = { commission: number; tax: number; slippage: number; adv: number };

export const COST_PRESETS: { id: string; label: string; desc: string; value: CostPct }[] = [
	{
		id: 'zero',
		label: 'Tanpa biaya',
		desc: 'Batas atas teoretis — komisi, pajak, slippage, dan cap likuiditas dimatikan.',
		value: { commission: 0, tax: 0, slippage: 0, adv: 0 }
	},
	{
		id: 'standard',
		label: 'Standar IDX',
		desc: 'Komisi 0,15%/sisi, pajak jual 0,1%, slippage 0,1%, cap likuiditas 2% nilai transaksi harian.',
		value: { commission: 0.15, tax: 0.1, slippage: 0.1, adv: 2 }
	},
	{
		id: 'conservative',
		label: 'Konservatif',
		desc: 'Komisi 0,25%/sisi, slippage 0,25%, cap likuiditas 1% — untuk saham berlikuiditas rendah.',
		value: { commission: 0.25, tax: 0.1, slippage: 0.25, adv: 1 }
	}
];

export const COST_FIELDS: { key: keyof CostPct; label: string; hint: string; step: number }[] = [
	{
		key: 'commission',
		label: 'Komisi (%/sisi)',
		hint: 'Biaya jasa sekuritas tiap kali membeli atau menjual.',
		step: 0.05
	},
	{
		key: 'tax',
		label: 'Pajak jual (%)',
		hint: 'Pajak penjualan saham 0,1% yang dipotong saat menjual.',
		step: 0.05
	},
	{
		key: 'slippage',
		label: 'Slippage (%/sisi)',
		hint: 'Selisih harga beli/jual nyata dari harga yang diharapkan.',
		step: 0.05
	},
	{
		key: 'adv',
		label: 'Cap likuiditas (% ADTV)',
		hint: 'Batas porsi order terhadap nilai transaksi harian emiten; 0 berarti tanpa batas.',
		step: 0.5
	}
];

export type TabId = 'ringkasan' | 'kurva' | 'perbandingan' | 'biaya' | 'ledger';

export const TABS: { id: TabId; label: string; hint: string; icon: LucideIcon }[] = [
	{ id: 'ringkasan', label: 'Ringkasan', hint: 'Hasil utama', icon: Trophy },
	{ id: 'kurva', label: 'Kurva Modal', hint: 'Pertumbuhan modal', icon: ChartLine },
	{
		id: 'perbandingan',
		label: 'Perbandingan',
		hint: 'Strategi vs beli-tahan',
		icon: ChartColumn
	},
	{ id: 'biaya', label: 'Biaya', hint: 'Yang menggerus untung', icon: Coins },
	{ id: 'ledger', label: 'Jejak Transaksi', hint: 'Tiap sesi rebalance', icon: ScrollText }
];
