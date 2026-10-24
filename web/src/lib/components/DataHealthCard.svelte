<script lang="ts">
	import { CircleCheck, Clock, TriangleAlert, XCircle, type LucideIcon } from '@lucide/svelte';
	import { useDataHealth } from '#lib/hooks.svelte.ts';
	import { fmtDateStr } from '#lib/format.ts';
	import Card from '#lib/components/Card.svelte';

	/**
	 * Kartu "Kesehatan Data" (Dashboard): menjawab "boleh percaya angka di layar?".
	 *
	 * Empat baris status, semua dibaca dari endpoint read-only /api/data-health
	 * yang memeriksa database langsung (bukan hasil hitungan sinyal): 1) kesegaran
	 * EOD vs hari bursa yang diharapkan, 2) cakupan kolom `foreign_*` per sesi,
	 * 3) jumlah baris per sesi vs median (menangkap sesi "separuh" akibat insert
	 * yang tersela di tengah sesi), 4) hari bursa tanpa baris raw_eod.
	 *
	 * Empat tingkat keparahan, dan bedanya disengaja: `info` = "sesi hari ini belum
	 * masuk", yang normal sebelum ~16:15 WIB dan BUKAN alarm; `warn` = ada yang
	 * janggal (sesi tertinggal, kolom bolong, sesi separuh); `bad` = sudah lewat
	 * jam batas dan data belum ada. Pemeriksa yang tidak memeriksa apa pun
	 * (`checked === 0`) juga `warn` — jangan hijau sambil tidak menilai apa-apa.
	 */

	const INFO =
		'Semua angka di dashboard ini tunduk pada data EOD — kalau kartu ini bicara, angka lain ikut diragukan. Empat pemeriksa dibaca langsung dari database (read-only), bukan dari perhitungan sinyal.';

	type Sev = 'ok' | 'info' | 'warn' | 'bad';

	const SEV_META: Record<Sev, { color: string; badge: string; label: string; sr: string }> = {
		ok: { color: 'var(--up)', badge: 'badge-buy', label: 'Sehat', sr: 'aman' },
		info: { color: 'var(--fg-muted)', badge: 'badge-hold', label: 'Menunggu', sr: 'menunggu' },
		warn: { color: 'var(--warn)', badge: 'badge-warn', label: 'Waspada', sr: 'waspada' },
		bad: { color: 'var(--down)', badge: 'badge-sell', label: 'Bermasalah', sr: 'bermasalah' }
	};

	const IKON: Record<Sev, LucideIcon> = {
		ok: CircleCheck,
		info: Clock,
		warn: TriangleAlert,
		bad: XCircle
	};

	/** Urutan prioritas saat menggabungkan keparahan empat baris jadi satu badge. */
	const URUT: Sev[] = ['bad', 'warn', 'info', 'ok'];

	const MAX_SEBUT = 4;

	/** Tanggal ISO -> teks pendek; `null` jadi "—", bukan "null". */
	const tgl = (s: string | null | undefined): string => fmtDateStr(s) ?? '—';

	type Baris = { label: string; detail: string; sev: Sev };

	const health = useDataHealth();
	const data = $derived(health.data);

	const view = $derived.by(() => {
		const d = data;
		if (!d) return null;

		const { freshness, field_coverage, row_counts, session_gaps } = d;

		const belumMasuk = freshness.missing.length > 0;
		const tertinggal = Math.max(freshness.stocks_behind, freshness.index_behind);
		const kosong = freshness.eod_latest === null;

		const sevKesegaran: Sev = !belumMasuk
			? 'ok'
			: freshness.overdue
				? 'bad'
				: kosong || tertinggal > 0
					? 'warn'
					: 'info';

		const detailKesegaran = !belumMasuk
			? `Saham & IHSG lengkap sampai sesi ${tgl(freshness.eod_latest)}`
			: freshness.overdue
				? `Belum masuk: ${freshness.missing.join(', ')} — hari bursa ${tgl(freshness.expected)} sudah lewat batas 16:00 WIB`
				: kosong || tertinggal > 0
					? `Tertinggal ${tertinggal} sesi bursa dari ${tgl(freshness.expected)} — ${freshness.missing.join(', ')}`
					: `Sesi ${tgl(freshness.expected)} belum masuk — normal sebelum ±16:15 WIB`;

		const basisTeks = session_gaps.basis.startsWith('kalender-bursa')
			? session_gaps.basis === 'kalender-bursa-pendek'
				? 'kalender IHSG (cakupan lebih pendek dari rentang data — lubang di luar cakupan tidak terlihat)'
				: 'kalender IHSG'
			: 'hari-kerja (perkiraan — kalender IHSG kosong)';

		const baris: Baris[] = [
			{ label: 'Kesegaran EOD', detail: detailKesegaran, sev: sevKesegaran },
			{
				label: 'Kolom arus asing (foreign_*)',
				detail:
					field_coverage.checked === 0
						? 'Belum ada sesi yang bisa diperiksa'
						: field_coverage.troublemakers.length
							? `${field_coverage.troublemakers.length} dari ${field_coverage.checked} sesi terakhir bolong (terburuk ${field_coverage.worst_pct}%)`
							: `${field_coverage.checked} sesi terakhir terisi semua`,
				sev: field_coverage.checked === 0 || field_coverage.troublemakers.length > 0 ? 'warn' : 'ok'
			},
			{
				label: 'Jumlah baris per sesi',
				detail:
					row_counts.checked === 0
						? 'Belum ada sesi yang bisa diperiksa'
						: row_counts.troublemakers.length
							? `${row_counts.troublemakers.length} sesi jauh di bawah ${row_counts.threshold_pct}% median (${row_counts.median_rows} baris) — ciri insert tersela di tengah sesi`
							: `Median ${row_counts.median_rows} baris/sesi; tidak ada sesi di bawah ${row_counts.threshold_pct}% median`,
				sev: row_counts.checked === 0 || row_counts.troublemakers.length > 0 ? 'warn' : 'ok'
			},
			{
				label: 'Hari bursa tanpa sesi',
				detail:
					session_gaps.sessions === 0
						? 'Belum ada sesi raw_eod yang bisa diperiksa'
						: session_gaps.missing.length
							? `${session_gaps.missing.length} hari bursa tanpa baris: ${session_gaps.missing
									.slice(0, MAX_SEBUT)
									.join(
										', '
									)}${session_gaps.missing.length > MAX_SEBUT ? ` +${session_gaps.missing.length - MAX_SEBUT} lagi` : ''}`
							: `0 lubang antara ${tgl(session_gaps.first)} → ${tgl(session_gaps.last)} (${session_gaps.sessions} sesi)`,
				sev: session_gaps.sessions === 0 || session_gaps.missing.length > 0 ? 'warn' : 'ok'
			}
		];

		const sev: Sev = URUT.find((s) => baris.some((b) => b.sev === s)) ?? 'ok';

		const headline =
			sev === 'ok'
				? 'Boleh percaya angka di dashboard — semua pemeriksa aman.'
				: sev === 'info'
					? 'Pemeriksa bersih; sesi hari ini belum masuk (normal sebelum ±16:15 WIB).'
					: sev === 'warn'
						? 'Ada yang janggal di dasar data — jangan andalkan angka sebelum dibereskan.'
						: 'Data bermasalah — angka di dashboard ini belum bisa dipercaya.';

		const sebutSesi = [...field_coverage.troublemakers, ...row_counts.troublemakers];

		return { sev, headline, baris, sebutSesi, basisTeks, checkedAt: d.checked_at.slice(0, 10) };
	});
</script>

{#if health.isLoading}
	<Card title="Kesehatan Data" subtitle="Boleh percaya angka di layar ini?" info={INFO}>
		<p class="text-muted text-xs">Memeriksa database...</p>
	</Card>
{:else if health.error || !data}
	<Card title="Kesehatan Data" subtitle="Boleh percaya angka di layar ini?" info={INFO}>
		<p class="text-warn text-xs">
			Penjaga data tidak terbaca — endpoint <code>/api/data-health</code> belum aktif atau backend mati.
			Selama kartu ini kosong, perlakukan angka di halaman ini dengan curiga.
		</p>
	</Card>
{:else if view}
	{@const v = view}
	<Card title="Kesehatan Data" subtitle="Boleh percaya angka di layar ini?" info={INFO}>
		{#snippet right()}
			<span class="badge tabular-nums {SEV_META[v.sev].badge}">{SEV_META[v.sev].label}</span>
		{/snippet}

		<div class="space-y-3">
			<p class="text-sm font-medium" role="status">{v.headline}</p>

			<ul class="space-y-2 text-[13px]">
				{#each v.baris as b (b.label)}
					{@const Ikon = IKON[b.sev]}
					<li class="flex items-start gap-2">
						<Ikon
							size={16}
							style="color: {SEV_META[b.sev].color}"
							class="mt-0.5 shrink-0"
							aria-hidden="true"
						/>
						<span class="min-w-0">
							<span class="sr-only">{SEV_META[b.sev].sr} — </span>
							<b>{b.label}</b> — <span class="text-muted">{b.detail}</span>
						</span>
					</li>
				{/each}
			</ul>

			{#if v.sebutSesi.length > 0}
				<p class="text-muted text-[11px]">
					Sesi bermasalah:
					{#each v.sebutSesi.slice(0, MAX_SEBUT) as s (s)}
						<code class="mr-1">{s}</code>
					{/each}
				</p>
			{/if}

			<p class="text-muted text-[11px]">
				Diperiksa {tgl(v.checkedAt)} · hari bursa dipilah dari {v.basisTeks}
			</p>
		</div>
	</Card>
{/if}
