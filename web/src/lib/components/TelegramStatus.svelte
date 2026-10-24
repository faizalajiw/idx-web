<script lang="ts">
	import { testTelegram } from '#lib/api.ts';
	import { useAlerts } from '#lib/hooks.svelte.ts';
	import Card from '#lib/components/Card.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	/**
	 * Telegram wiring check. Alerts are useless if the bot is not reachable, and
	 * "nothing happened" looks identical to "wrong chat id", so this panel lets the
	 * user fire one real message and see the outcome.
	 */
	const alerts = useAlerts();
	// Getter hook: baca lewat objek, lalu salin ke `$derived` agar tetap reaktif.
	const data = $derived(alerts.data);
	const error = $derived(alerts.error);
	const isLoading = $derived(alerts.isLoading);
	let busy = $state(false);
	let result = $state<{ ok: boolean; detail: string } | null>(null);

	const enabled = $derived(data?.telegram_enabled ?? false);

	async function handleTest() {
		if (busy) return;
		busy = true;
		result = null;
		try {
			const res = await testTelegram();
			result = { ok: res.sent, detail: res.detail };
		} catch (e) {
			result = {
				ok: false,
				detail: e instanceof Error ? e.message : 'Gagal mengirim pesan uji'
			};
		} finally {
			busy = false;
		}
	}
</script>

<Card
	title="Koneksi Telegram"
	subtitle="Tujuan pengiriman notifikasi aturan di samping"
	info="Menghubungkan aplikasi ke Telegram supaya kamu dapat notifikasi otomatis saat aturan alert terpenuhi — jadi nggak perlu pelototin dashboard terus."
>
	{#snippet right()}
		{#if data}
			<span class={enabled ? 'badge badge-buy' : 'badge badge-warn'}>
				{enabled ? 'Terhubung' : 'Belum diatur'}
			</span>
		{/if}
	{/snippet}

	{#if error}
		<ErrorState
			message="Gagal memeriksa status: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else if isLoading || !data}
		<Skeleton class="h-40" />
	{:else}
		<div class="space-y-3">
			{#if enabled}
				<p class="text-muted text-sm leading-relaxed">
					Bot dan chat id sudah terbaca dari <code>.env</code>. Kirim satu pesan uji untuk
					memastikan notifikasi benar-benar sampai.
				</p>
			{:else}
				<p class="text-muted text-sm leading-relaxed">
					Notifikasi belum aktif. Isi dua variabel ini di
					<code>idx-scraper/.env</code> lalu restart API:
				</p>
				<pre
					class="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card-solid)] p-3 text-xs">{`TELEGRAM_BOT_TOKEN=123456:ABC…\nTELEGRAM_CHAT_ID=123456789`}</pre>
				<p class="text-muted text-xs leading-relaxed">
					Bikin bot lewat @BotFather di Telegram, lalu kirim pesan apa saja ke bot itu dan ambil
					chat id-nya. Aturan tetap tersimpan dan dievaluasi walau Telegram belum diisi — cuma
					notifikasinya yang belum terkirim.
				</p>
			{/if}

			<button
				type="button"
				class="btn btn-primary"
				onclick={() => void handleTest()}
				disabled={!enabled || busy}
				title={enabled ? undefined : 'Isi TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID dulu'}
			>
				{busy ? 'Mengirim…' : 'Kirim pesan uji'}
			</button>

			{#if result}
				<p class="text-sm {result.ok ? 'text-up' : 'text-down'}">{result.detail}</p>
			{/if}
			{#if !enabled}
				<p class="text-muted text-xs">
					Tombol uji aktif setelah <code>.env</code> terisi.
				</p>
			{/if}
		</div>
	{/if}
</Card>
