<script lang="ts">
	import { page } from '$app/state';
	import { NAV_GROUPS } from '#lib/nav.ts';
</script>

<nav class="flex flex-col gap-5" aria-label="Navigasi utama">
	{#each NAV_GROUPS as group (group.title)}
		<div>
			<p class="nav-group-title text-muted mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
				{group.title}
			</p>
			<ul class="space-y-0.5">
				{#each group.items as item (item.href)}
					{@const active = page.url.pathname === item.href}
					{@const Icon = item.icon}
					<li>
						<a
							href={item.href}
							title={item.label}
							aria-current={active ? 'page' : undefined}
							class="nav-link {active ? 'nav-link-active' : ''}"
						>
							<Icon size={17} strokeWidth={2} aria-hidden="true" />
							<span class="nav-label">{item.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>
