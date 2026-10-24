<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import ThemeToggle from "#lib/components/ThemeToggle.svelte";

	/**
	 * Pengganti `app/not-found.tsx` + `app/error.tsx` dari Next: rute yang tidak
	 * dikenal tampil sebagai halaman "tidak ditemukan", error lain memakai copy
	 * kegagalan. Judul tab dibiarkan "Market Labs" seperti di Next.
	 */
	const notFound = $derived(page.status === 404);
	const detail = $derived(page.error?.message ?? "-");
</script>

{#if notFound}
	<div class="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
		<div class="max-w-md">
			<h1 class="mt-8 mb-1 text-2xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
			<p class="text-muted text-sm leading-relaxed">
				Halaman yang kamu tuju tidak ada atau sudah dipindah. Coba kembali, atau cek penulisan
				alamatnya.
			</p>
			<div class="mt-6 flex items-center justify-center gap-3">
				<button type="button" class="btn btn-primary" onclick={() => goto("/")}>
					Kembali ke beranda
				</button>
				<button type="button" class="btn btn-ghost" onclick={() => window.history.back()}>
					Kembali
				</button>
				<ThemeToggle />
			</div>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
		<div class="max-w-md">
			<h1 class="mt-6 mb-1 text-2xl font-bold tracking-tight">
				Halaman ingin disajikan tapi kami mengalami masalah.
			</h1>
			<p class="text-muted text-sm leading-relaxed">
				Silakan coba lagi dalam sebentar. Jika hal ini terus-menerus muncul, lapor pada admin.
			</p>
			<p class="text-muted mt-4 text-xs">{detail}</p>
			<div class="mt-6 flex items-center justify-center gap-3">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => window.location.reload()}
					aria-label="Muat ulang halaman"
				>
					Muat lagi
				</button>
				<button
					type="button"
					class="btn btn-ghost"
					onclick={() => window.history.back()}
					aria-label="Kembali ke halaman sebelumnya"
				>
					Kembali
				</button>
				<ThemeToggle />
			</div>
		</div>
	</div>
{/if}
