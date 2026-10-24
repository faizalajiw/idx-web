<script lang="ts">
	import { ShieldAlert, ShieldCheck } from "@lucide/svelte";
	import {
		useJournalClaims,
		useJournalHalt,
		useJournalResume,
		useJournalState,
		useJournalSummary
	} from "#lib/hooks.svelte.ts";
	import { fmtNum } from "#lib/format.ts";
	import type { JournalClaim, JournalSummary } from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";

	/**
	 * Blok rekaman klaim mesin (lapis 4) di atas papan kandidat.
	 *
	 * Mesin menulis klaimnya sendiri tiap sesi bursa, sebelum hasilnya diketahui, lalu
	 * hasilnya diperiksa apa adanya. Blok ini menampilkan empat angka buku lebih dulu
	 * daripada isinya (spec D11), lalu gerbang yang menahan klaim baru dan tombol
	 * untuk menghentikannya sendiri.
	 *
	 * Keadaan gerbang dibaca terpisah dari rekaman: buku yang belum terbaca tidak
	 * boleh menyembunyikan keadaan gerbang, dan sebaliknya.
	 */

	const VERDICT_META: Record<string, { label: string; badge: string }> = {
		terbukti: { label: "Terbukti", badge: "badge badge-buy" },
		"tidak terbukti": { label: "Tidak terbukti", badge: "badge badge-sell" },
		"belum cukup": { label: "Belum cukup bukti", badge: "badge badge-hold" }
	};

	const STATUS_BADGE: Record<string, string> = {
		terbuka: "badge badge-hold",
		kena_target: "badge badge-buy",
		kena_stop: "badge badge-sell",
		kedaluwarsa: "badge badge-warn"
	};

	const STATUS_LABEL: Record<string, string> = {
		terbuka: "terbuka",
		kena_target: "kena target",
		kena_stop: "kena stop",
		kedaluwarsa: "kedaluwarsa"
	};

	const rp = (v: number | null | undefined) =>
		v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

	/** Abnormal dalam fraksi (0.014 = +1,4%); "belum terukur" berarti belum ada, bukan nol. */
	const abn = (v: number | null | undefined) =>
		v === null || v === undefined || Number.isNaN(v)
			? "belum terukur"
			: `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;

	/** Tanggal sesi terbaru di buku (ISO, urut leksikografis = urut waktu). */
	function sesiTerakhir(summary: JournalSummary): string | null {
		const tanggal = summary.per_session.map((s) => s.trade_date);
		return tanggal.length > 0 ? tanggal.reduce((a, b) => (a > b ? a : b)) : null;
	}

	const summary = useJournalSummary();
	const buku = $derived(summary.data);
	const bukuError = $derived(summary.error);
	const bukuLoading = $derived(summary.isLoading);

	const sesi = $derived(buku ? sesiTerakhir(buku) : null);
	const claims = useJournalClaims(() => sesi, 20);
	// Getter `data` hanya reaktif bila dibaca lewat objeknya; salin sekali ke `$derived`.
	const klaim = $derived(claims.data);
	const gate = useJournalState();
	const gerbang = $derived(gate.data);

	const verdict = $derived(buku?.verdict ?? null);
	const meta = $derived(verdict ? (VERDICT_META[verdict.status] ?? null) : null);
	const perSesi = $derived(
		[...(buku?.per_session ?? [])].sort((a, b) => b.trade_date.localeCompare(a.trade_date))
	);
	const celah = $derived(gerbang?.gaps ?? []);

	// Kontrol gerbang: satu instance per blok, jadi keadaannya hidup di sini.
	let terbuka = $state(false);
	let alasan = $state("");
	let sibuk = $state(false);
	let galat = $state<string | null>(null);
	let inputRef = $state<HTMLInputElement | undefined>(undefined);
	let pemicuRef = $state<HTMLButtonElement | undefined>(undefined);

	const halt = useJournalHalt();
	const resume = useJournalResume();

	/** Tutup dialog dan kembalikan fokus ke tombol yang membukanya. */
	function tutup() {
		terbuka = false;
		pemicuRef?.focus();
	}

	$effect(() => {
		if (!terbuka) return;
		inputRef?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") tutup();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	async function kirim() {
		if (sibuk || alasan.trim() === "") return;
		sibuk = true;
		galat = null;
		try {
			await halt(alasan.trim());
			alasan = "";
			terbuka = false;
		} catch (e) {
			galat = e instanceof Error ? e.message : "Gagal menghentikan klaim";
		} finally {
			sibuk = false;
		}
	}

	async function bukaLagi() {
		if (sibuk) return;
		sibuk = true;
		galat = null;
		try {
			await resume();
		} catch (e) {
			galat = e instanceof Error ? e.message : "Gagal membuka lagi klaim";
		} finally {
			sibuk = false;
		}
	}
</script>

{#snippet stat(label: string, value: string, tone = "")}
	<div>
		<p class="text-muted text-[11px]">{label}</p>
		<p class="mt-0.5 text-sm font-semibold tabular-nums {tone}">{value}</p>
	</div>
{/snippet}

{#snippet barisKlaim(row: JournalClaim)}
	<li
		class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] py-1.5 last:border-b-0"
	>
		<span class="font-semibold tabular-nums">{row.code}</span>
		<span class={STATUS_BADGE[row.status] ?? "badge badge-hold"}>
			{STATUS_LABEL[row.status] ?? row.status}
		</span>
		<span class="text-muted tabular-nums">
			stop {rp(row.stop_raw)} · target {rp(row.target_raw)}
		</span>
		<span class="text-muted ml-auto tabular-nums">
			{row.outcome_abn === null ? "hasil belum terukur" : abn(row.outcome_abn)}
		</span>
	</li>
{/snippet}

{#snippet gerbangKontrol(g: NonNullable<typeof gerbang>)}
	{#if g.halt.halted}
		<div class="space-y-2">
			<p class="text-warn text-xs leading-relaxed tabular-nums" role="status">
				Dihentikan manual oleh {g.halt.by ?? "pemilik"}:
				{g.halt.reason ?? "tanpa sebab tertulis"}{g.halt.at
					? ` (${g.halt.at.slice(0, 16).replace("T", " ")} WIB)`
					: ""}. Mesin berhenti menulis klaim baru, bukan menghapus klaim yang sudah ada.
			</p>
			<button
				type="button"
				class="btn btn-ghost min-h-11 w-full sm:w-auto"
				onclick={() => void bukaLagi()}
				disabled={sibuk}
			>
				{sibuk ? "Membuka…" : "Buka lagi penulisan klaim"}
			</button>
			{#if galat}<ErrorState message={galat} />{/if}
		</div>
	{:else}
		<div class="space-y-2">
			<button
				bind:this={pemicuRef}
				type="button"
				class="btn btn-ghost min-h-11 w-full sm:w-auto"
				onclick={() => (terbuka = true)}
			>
				Hentikan penulisan klaim baru
			</button>
			{#if galat}<ErrorState message={galat} />{/if}

			{#if terbuka}
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="halt-klaim-judul"
					class="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elev)] p-4"
				>
					<h3 id="halt-klaim-judul" class="text-sm font-semibold">
						Hentikan penulisan klaim baru?
					</h3>
					<p class="text-muted mt-1 text-xs leading-relaxed">
						Mesin berhenti menulis klaim baru sampai dibuka lagi. Klaim yang sudah ada tidak
						dihapus, dan sebabnya ikut tercatat supaya jelas ini keputusan, bukan kerusakan.
					</p>
					<label class="mt-3 block">
						<span class="text-muted text-xs">Sebab (wajib)</span>
						<input
							bind:this={inputRef}
							type="text"
							class="input mt-1 w-full"
							bind:value={alasan}
							placeholder="mis. hasilnya lagi tidak aku percaya"
						/>
					</label>
					<div class="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							class="btn btn-primary min-h-11"
							onclick={() => void kirim()}
							disabled={sibuk || alasan.trim() === ""}
						>
							{sibuk ? "Menghentikan…" : "Ya, hentikan"}
						</button>
						<button type="button" class="btn btn-ghost min-h-11" onclick={tutup} disabled={sibuk}>
							Batal
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

<Card
	title="Rekaman Klaim Mesin"
	subtitle="Ditulis sebelum hasilnya ada, diperiksa apa adanya"
	info="Tiap sesi bursa mesin menulis klaim untuk 3 sampai 5 nama kategori Teratas, dan menuliskan levelnya sebelum hasilnya diketahui. Rekaman ini yang mengikatnya: kalau aturannya tidak terbukti, mesin berhenti menulis klaim baru alih-alih diam-diam pindah aturan."
>
	{#snippet right()}
		{#if meta && verdict}
			<span class={meta.badge} title={verdict.reason}>{meta.label}</span>
		{/if}
	{/snippet}

	<div class="space-y-4">
		<!-- Rekaman: satu-satunya bagian yang boleh gagal tanpa menyembunyikan gerbang. -->
		{#if bukuError}
			<ErrorState
				message="Gagal memuat rekaman klaim: {bukuError instanceof Error
					? bukuError.message
					: String(bukuError)}"
			/>
		{:else if bukuLoading || !buku}
			<Skeleton class="h-40" />
		{:else}
			{#if buku.note}
				<p class="text-warn text-xs leading-relaxed">{buku.note}</p>
			{/if}

			<p class="text-sm font-medium">{buku.record_line}</p>

			{#if buku.claims === 0 && !buku.note}
				<p class="text-muted text-xs leading-relaxed">
					Buku ini masih kosong: belum ada klaim yang tertulis. Klaim pertama ditulis job
					terjadwal sesudah sesi bursa tutup, lalu hasilnya diperiksa setelah horizonnya
					berjalan (21 hari bursa).
				</p>
			{/if}

			{#if buku.claims > 0}
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					{@render stat("Klaim tertulis", fmtNum(buku.claims))}
					{@render stat("Sudah terukur", fmtNum(buku.measured_claims))}
					{@render stat("Kena target", fmtNum(buku.hit_target), "text-up")}
					{@render stat("Kena stop", fmtNum(buku.hit_stop), "text-down")}
					{@render stat(
						"Rata-rata vs pasar",
						abn(buku.mean_abnormal),
						buku.mean_abnormal === null
							? "text-muted"
							: buku.mean_abnormal > 0
								? "text-up"
								: "text-down"
					)}
					{@render stat("Sesi terukur", fmtNum(buku.sessions))}
				</div>

				<p class="text-muted text-xs tabular-nums">
					{fmtNum(buku.open)} masih terbuka · {fmtNum(buku.expired)} kedaluwarsa{buku.horizon_mismatch >
					0
						? ` · ${fmtNum(buku.horizon_mismatch)} horizonnya tidak cocok`
						: ""}
					{" · "}
					{fmtNum(buku.claim_sessions)} sesi menulis klaim, {fmtNum(buku.sessions)}
					sesi sudah terukur. Rata-rata dihitung per sesi dulu, baru antar sesi.
				</p>

				<details>
					<summary class="text-muted cursor-pointer text-xs">
						Rincian per sesi{sesi ? ` (terbaru ${sesi})` : ""}
					</summary>
					<ul class="mt-2 space-y-0.5 text-xs tabular-nums">
						{#each perSesi.slice(0, 5) as s (s.trade_date)}
							<li class="flex flex-wrap gap-x-3">
								<span class="text-muted">{s.trade_date}</span>
								<span>{fmtNum(s.claims)} klaim</span>
								<span class="text-muted ml-auto">{abn(s.mean_abnormal)}</span>
							</li>
						{/each}
					</ul>
					{#if sesi && klaim && klaim.length > 0}
						<ul class="mt-2">
							{#each klaim as row (`${row.code}-${row.trade_date}`)}
								{@render barisKlaim(row)}
							{/each}
						</ul>
					{/if}
				</details>
			{/if}
		{/if}

		<!-- Gerbang dibaca terpisah dari rekaman: buku yang belum terbaca tidak boleh
		     menyembunyikan keadaan gerbang, dan tombol halt harus tetap bisa dipakai. -->
		{#if gerbang}
			<div class="rounded-lg border border-dashed border-[var(--border)] p-3">
				<p class="flex items-center gap-1.5 text-xs font-medium">
					{#if gerbang.allowed}
						<ShieldCheck size={14} class="shrink-0 text-up" aria-hidden />
					{:else}
						<ShieldAlert
							size={14}
							class="mt-0.5 shrink-0"
							style="color: var(--warn)"
							aria-hidden
						/>
					{/if}
					Gerbang klaim
				</p>
				<p
					class="mt-1 text-xs leading-relaxed {gerbang.allowed ? 'text-muted' : 'text-warn'}"
					role="status"
				>
					{gerbang.allowed
						? "Terbuka: sesudah sesi tutup, mesin menulis klaim baru seperti biasa."
						: gerbang.message}
				</p>
				{#if gerbang.note}
					<p class="text-warn mt-1 text-xs leading-relaxed">{gerbang.note}</p>
				{/if}
				<div class="mt-3">
					{@render gerbangKontrol(gerbang)}
				</div>
			</div>
		{/if}

		{#if celah.length > 0}
			<p class="text-muted text-xs leading-relaxed tabular-nums">
				{fmtNum(celah.length)} sesi terakhir tanpa klaim dan tanpa penolakan, jadi job-nya tidak
				menulis apa pun untuk sesi itu:
				{celah
					.slice(0, 5)
					.map((g) => g.trade_date)
					.join(" · ")}{celah.length > 5 ? ` dan ${fmtNum(celah.length - 5)} sesi lain` : ""}.
			</p>
		{/if}
	</div>
</Card>
