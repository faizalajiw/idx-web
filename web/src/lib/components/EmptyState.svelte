<script lang="ts">
	let { message = "Tidak ada data." }: { message?: string } = $props();
</script>

<div
	class="text-muted rounded-2xl border border-dashed border-[var(--border)] py-8 text-center text-sm"
>
	{message}
</div>
