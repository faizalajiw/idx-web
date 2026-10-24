<script lang="ts">
	import { BookOpen } from '@lucide/svelte';
	import Card from '#lib/components/Card.svelte';
</script>

<Card title="Istilah singkat" subtitle="Arti kata yang sering muncul di halaman ini">
	{#snippet right()}
		<BookOpen size={16} class="text-muted" />
	{/snippet}
	<dl class="grid gap-3 text-sm sm:grid-cols-2">
		<div class="min-w-0">
			<dt class="font-semibold text-[var(--fg)]">Backtest</dt>
			<dd class="text-muted">Menguji strategi memakai data masa lalu.</dd>
		</div>
		<div class="min-w-0">
			<dt class="font-semibold text-[var(--fg)]">Beli &amp; tahan</dt>
			<dd class="text-muted">
				Beli semua emiten di awal lalu diamkan sampai akhir — pembanding paling jujur.
			</dd>
		</div>
		<div class="min-w-0">
			<dt class="font-semibold text-[var(--fg)]">Susun ulang (rebalance)</dt>
			<dd class="text-muted">
				Momen strategi menyesuaikan kembali komposisi portofolio sesuai aturannya.
			</dd>
		</div>
		<div class="min-w-0">
			<dt class="font-semibold text-[var(--fg)]">Biaya transaksi</dt>
			<dd class="text-muted">
				Komisi, pajak jual, dan slippage yang dibayar setiap kali transaksi.
			</dd>
		</div>
		<div class="min-w-0">
			<dt class="font-semibold text-[var(--fg)]">Cap likuiditas</dt>
			<dd class="text-muted">
				Batas porsi order terhadap nilai transaksi harian; saham tipis hanya bisa diisi sebagian per
				hari.
			</dd>
		</div>
		<div class="min-w-0">
			<dt class="font-semibold text-[var(--fg)]">Jatuh terdalam (drawdown)</dt>
			<dd class="text-muted">
				Penurunan terbesar dari titik tertinggi ke terendah selama periode uji.
			</dd>
		</div>
	</dl>
</Card>
