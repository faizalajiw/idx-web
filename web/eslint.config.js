import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// TypeScript sudah memeriksa global; `no-undef` hanya menghasilkan false positive.
			'no-undef': 'off',
			// Nama berawalan garis bawah menandai parameter yang sengaja tidak dipakai.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],
			// Aplikasi ini membangun href dari data (`/stock/${code}`) dan belum memakai
			// typed routes; `resolve()` hanya bisa dipakai kalau semua rute diberi tipe.
			'svelte/no-navigation-without-resolve': 'off',
			// `{" "}` dipakai eksplisit supaya spasi tidak hilang saat markup diformat.
			'svelte/no-useless-mustaches': 'off',
			// Map/Set/URLSearchParams/Date di sini adalah nilai kerja non-reaktif
			// (cache, parameter fetch, tanggal), bukan state yang dirender.
			'svelte/prefer-svelte-reactivity': 'off',
			// Dua form memakai `$state` + `$effect` karena draft harus bisa diedit
			// sekaligus disetel ulang saat URL berubah; `$derived` tidak bisa ditulis.
			'svelte/prefer-writable-derived': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				// SvelteKit 3 menaruh konfigurasi di vite.config.ts, bukan svelte.config.js.
				extraFileExtensions: ['.svelte']
			}
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'node_modules/',
			'test-results/',
			'playwright-report/',
			'static/'
		]
	}
);
