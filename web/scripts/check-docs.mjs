#!/usr/bin/env node
/**
 * Gerbang dokumentasi: tautan harus hidup, dan dokumen aktif tidak boleh
 * menyebut stack atau path yang sudah tidak ada.
 *
 * Kenapa ada: audit 25 Okt 2026 menemukan 24 dari 32 berkas .md memuat tautan
 * mati dan puluhan rujukan ke app Next yang sudah diarsipkan.
 *
 * Aturan:
 * 1. Setiap tautan relatif `[teks](target)` harus menunjuk berkas/folder nyata.
 * 2. Dokumen aktif tidak boleh memuat penanda stack lama (lihat FORBIDDEN).
 * 3. Berkas yang diawali/ditandai `<!-- arsip -->` dilewati: itu catatan
 *    historis, bukan rujukan yang dipakai.
 *
 * Pakai: node scripts/check-docs.mjs [--verbose]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const verbose = process.argv.includes('--verbose');

const ROOTS = ['docs', 'web/docs'];
const SINGLE_FILES = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'web/README.md'];

const ARSIP = /<!--\s*arsip\b/i;
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'build', '.git', 'test-results']);

// Penanda stack/path yang sudah tidak ada di repo. Semua dicek case-sensitive
// supaya nama berkas seperti `next.config.ts` yang masih ada tidak ikut kena.
const FORBIDDEN = [
	{ needle: 'NEXT_PUBLIC_', why: 'env Next; app produksi memakai PUBLIC_API_BASE_URL' },
	{ needle: 'lib/hooks.ts', why: 'hook SvelteKit ada di src/lib/hooks.svelte.ts' },
	{ needle: 'useSearchParams', why: 'SvelteKit memakai page.url.searchParams' },
	{ needle: 'useRouter', why: 'SvelteKit memakai goto() dari $app/navigation' },
	{ needle: 'next start', why: 'app produksi adalah SPA statis (deploy/serve.mjs atau nginx)' },
	{ needle: 'next build', why: 'build memakai vite lewat npm run build di web/' },
	{
		needle: '../../idx-web/',
		why: 'tautan relatif harus dari docs/ ke ../web/, bukan lewat nama repo'
	}
];

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const FENCE = /```[\s\S]*?```/g;

function walk(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = resolve(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (entry.name.endsWith('.md')) out.push(full);
	}
	return out;
}

function collectFiles() {
	const files = [];
	for (const root of ROOTS) {
		const dir = resolve(REPO, root);
		if (existsSync(dir)) walk(dir, files);
	}
	for (const name of SINGLE_FILES) {
		const full = resolve(REPO, name);
		if (existsSync(full)) files.push(full);
	}
	return files.sort();
}

const problems = [];
const skipped = [];

for (const file of collectFiles()) {
	const rel = relative(REPO, file).replaceAll('\\', '/');
	const raw = readFileSync(file, 'utf8');
	if (ARSIP.test(raw)) {
		skipped.push(rel);
		continue;
	}

	// Tautan di dalam blok kode bukan tautan; buang dulu.
	const text = raw.replace(FENCE, '');

	for (const match of text.matchAll(LINK)) {
		const target = match[1];
		if (/^(https?:|mailto:|tel:|#|\/\/)/.test(target)) continue;
		const path = target.split('#')[0].split('?')[0];
		if (!path) continue;
		const abs = resolve(dirname(file), decodeURI(path));
		if (!existsSync(abs)) {
			problems.push(`${rel}: tautan mati -> ${target}`);
			continue;
		}
		// App Next di akar repo masih ada di disk tapi bukan tempat kode hidup.
		const fromRepo = relative(REPO, abs).replaceAll('\\', '/');
		if (/^(app|components|lib|public)\//.test(fromRepo)) {
			problems.push(`${rel}: tautan ke app Next yang diarsipkan -> ${target}`);
		}
	}

	for (const rule of FORBIDDEN) {
		let at = text.indexOf(rule.needle);
		while (at !== -1) {
			const line = text.slice(0, at).split('\n').length;
			problems.push(`${rel}:${line}: "${rule.needle}" — ${rule.why}`);
			at = text.indexOf(rule.needle, at + rule.needle.length);
		}
	}
}

if (verbose) {
	console.log(`diperiksa: ${collectFiles().length} berkas, dilewati (arsip): ${skipped.length}`);
	for (const s of skipped) console.log(`  arsip  ${s}`);
}

if (problems.length > 0) {
	console.error(`Dokumentasi tidak konsisten: ${problems.length} temuan\n`);
	for (const p of problems) console.error(`  ${p}`);
	console.error('\nPerbaiki rujukannya, atau tandai berkas historis dengan <!-- arsip -->.');
	process.exit(1);
}

console.log(
	`Dokumentasi konsisten: ${collectFiles().length - skipped.length} berkas aktif, ${skipped.length} diarsipkan.`
);
