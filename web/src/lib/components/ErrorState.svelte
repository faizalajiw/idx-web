<script lang="ts">
	/**
	 * Kondisi error sementara / gagal — fokus pada aksi "Coba lagi".
	 * `occurredAt` kosong atau lebih tua dari 10 detik = percobaan sebelumnya
	 * sudah lama, jadi labelnya "Coba sekali lagi".
	 */
	let {
		message,
		occurredAt,
		onRetry
	}: {
		message: string;
		occurredAt?: Date;
		onRetry?: () => void;
	} = $props();

	const stale = $derived(!occurredAt || Date.now() - occurredAt.getTime() > 10_000);
</script>

<div class="alert-error text-down p-3 text-sm" role="alert">
	{message}
	{#if onRetry}
		<button
			type="button"
			onclick={onRetry}
			class="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] text-[var(--accent-text)] text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-1"
			aria-label="Coba lagi"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M1 4v6h6" />
				<path d="M3.5 15.5A9 9 0 0 1 17.5 8" />
			</svg>
			{stale ? "Coba sekali lagi" : "Coba lagi"}
		</button>
	{/if}
</div>
