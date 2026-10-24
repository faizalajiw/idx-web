<script module lang="ts">
	// Palet warna monogram (nyambung ke tema flat terminal).
	const PALETTE = [
		'#2962ff',
		'#26a69a',
		'#f5a623',
		'#ef5350',
		'#9c27b0',
		'#00897b',
		'#5c6bc0',
		'#ec407a',
		'#7cb342',
		'#fb8c00'
	];

	function hashColor(code: string): string {
		let h = 0;
		for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
		return PALETTE[h % PALETTE.length];
	}

	type ManifestEntry = { code: string; status: string; file: string | null };

	// Manifest di-fetch sekali per sesi browser, lalu dibagi ke semua instance.
	const logoMapPromises = new Map<string, Promise<Map<string, string>>>();

	function loadLogoMap(basePath: string): Promise<Map<string, string>> {
		let promise = logoMapPromises.get(basePath);
		if (!promise) {
			promise = fetch(`${basePath}/manifest.json`, { cache: 'no-store' })
				.then((r) => (r.ok ? r.json() : { entries: [] }))
				.then((data: { entries?: ManifestEntry[] }) => {
					const map = new Map<string, string>();
					for (const e of data.entries ?? []) {
						if (e.status === 'ok' && e.file) map.set(e.code, `${basePath}/${e.file}`);
					}
					return map;
				})
				.catch(() => new Map<string, string>());
			logoMapPromises.set(basePath, promise);
		}
		return promise;
	}
</script>

<script lang="ts">
	/**
	 * Logo kode saham (emiten) atau broker. `basePath` menentukan folder aset
	 * dan manifest-nya; default ke emiten. Tanpa logo, tampil monogram.
	 */
	let {
		code,
		size = 24,
		class: className = '',
		basePath = '/logos'
	}: {
		code: string;
		size?: number;
		class?: string;
		basePath?: string;
	} = $props();

	const upper = $derived(code.toUpperCase());
	let src = $state<string | null>(null);

	$effect(() => {
		const current = upper;
		const base = basePath;
		let active = true;
		loadLogoMap(base).then((map) => {
			if (active) src = map.get(current) ?? null;
		});
		return () => {
			active = false;
		};
	});
</script>

{#if src}
	<img
		{src}
		alt=""
		width={size}
		height={size}
		class="shrink-0 rounded-full bg-white object-contain {className}"
		style="width: {size}px; height: {size}px"
		onerror={() => (src = null)}
	/>
{:else}
	<span
		aria-hidden="true"
		class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white {className}"
		style="width: {size}px; height: {size}px; background: {hashColor(upper)}; font-size: {size *
			0.4}px; line-height: 1"
	>
		{upper.slice(0, 2)}
	</span>
{/if}
