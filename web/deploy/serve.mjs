#!/usr/bin/env node
/**
 * Server statis tanpa dependensi, untuk memeriksa hasil build di mesin lokal
 * atau sebagai cadangan kalau server tidak punya nginx/Caddy.
 *
 * Perilaku yang wajib sama dengan konfigurasi produksi:
 * - permintaan tanpa berkas cocok dikembalikan sebagai index.html dengan 200;
 * - `/_app/immutable/*` dan `/fonts/*` immutable setahun;
 * - `index.html` no-cache.
 *
 * Pakai: node deploy/serve.mjs [port] [direktori]
 *   node deploy/serve.mjs 3000 build
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.argv[2] ?? 3000);
const root = resolve(process.argv[3] ?? "build");

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".txt": "text/plain; charset=utf-8",
	".pdf": "application/pdf"
};

function cacheControl(pathname) {
	if (pathname.startsWith("/_app/immutable/") || pathname.startsWith("/fonts/")) {
		return "public, max-age=31536000, immutable";
	}
	if (pathname === "/" || pathname.endsWith(".html")) return "no-cache";
	if (pathname.startsWith("/logos/")) return "public, max-age=604800";
	return "public, max-age=3600";
}

// Berkas di bawah awalan ini selalu punya nama ber-hash. Kalau tidak ada, itu
// tanda HTML basi menunjuk bundel lama: balas 404, jangan index.html — kalau
// tidak, browser menerima HTML dengan Content-Type javascript dan gagal dengan
// galat MIME yang menyesatkan.
const ASET = ["/_app/", "/logos/", "/fonts/"];

const server = createServer((req, res) => {
	const url = new URL(req.url ?? "/", "http://localhost");
	const pathname = decodeURIComponent(url.pathname);

	// Jangan pernah keluar dari direktori build.
	const asked = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
	let file = join(root, asked);
	let sajikan = pathname;

	if (!existsSync(file) || statSync(file).isDirectory()) {
		if (ASET.some((awalan) => pathname.startsWith(awalan))) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("tidak ada");
			return;
		}
		file = join(root, "index.html");
		sajikan = "/index.html";
	}

	const type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
	res.writeHead(200, {
		"Content-Type": type,
		"Content-Length": statSync(file).size,
		"Cache-Control": cacheControl(sajikan)
	});
	if (req.method === "HEAD") {
		res.end();
		return;
	}
	createReadStream(file).pipe(res);
});

server.listen(port, () => {
	console.log(`sajian statis: http://localhost:${port} dari ${root}`);
});
