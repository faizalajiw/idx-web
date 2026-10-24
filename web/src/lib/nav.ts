import type { LucideIcon } from '@lucide/svelte';
import {
	Activity,
	ArrowLeftRight,
	Bell,
	Earth,
	FlaskConical,
	Funnel,
	LayoutDashboard,
	LayoutGrid,
	Radar,
	RotateCcwClock,
	Scale,
	ShieldCheck,
	Target,
	WavesHorizontal
} from '@lucide/svelte';

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
	{
		title: 'Utama',
		items: [
			{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
			{ href: '/pantau', label: 'Pantau', icon: Bell }
		]
	},
	{
		title: 'Screening',
		items: [{ href: '/screener', label: 'Screener AI', icon: Funnel }]
	},
	{
		title: 'Analisis',
		items: [
			{ href: '/rekomendasi', label: 'Rekomendasi Beli', icon: Target },
			{ href: '/keputusan', label: 'Ruang Keputusan', icon: Scale },
			{ href: '/jejak-sinyal', label: 'Jejak Sinyal', icon: RotateCcwClock },
			{ href: '/backtest', label: 'Backtest', icon: FlaskConical },
			{ href: '/faktor', label: 'Faktor & Kalibrasi', icon: ShieldCheck }
		]
	},
	{
		title: 'Flow',
		items: [
			{ href: '/radar', label: 'Radar Smart Money', icon: Radar },
			{ href: '/foreign', label: 'Foreign Flow', icon: Earth },
			{ href: '/flow', label: 'Aliran Dana Emiten', icon: ArrowLeftRight },
			{ href: '/sentimen', label: 'Sentimen', icon: WavesHorizontal },
			{ href: '/broker-activity', label: 'Aktivitas Broker', icon: Activity }
		]
	},
	{
		title: 'Sektor',
		items: [{ href: '/sectors', label: 'Sektor', icon: LayoutGrid }]
	}
];
