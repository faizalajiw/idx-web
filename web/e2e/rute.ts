/**
 * Rute statis papan, sama dengan daftar rute app Next.
 *
 * Rute berparameter (`/stock/[code]`, `/dossier/[code]`, `/flow/[code]`,
 * `/radar/[code]`, `/keputusan/[code]`) tidak masuk: isinya bergantung pada data
 * sesi, dan tes ini harus lulus walau API mati atau pasar tutup.
 */
export const RUTE = [
	"/",
	"/backtest",
	"/broker-activity",
	"/faktor",
	"/flow",
	"/foreign",
	"/jejak-sinyal",
	"/keputusan",
	"/pantau",
	"/radar",
	"/rekomendasi",
	"/screener",
	"/sectors",
	"/sentimen"
] as const;
