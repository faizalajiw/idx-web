/**
 * Cache query kecil pengganti SWR: satu panggilan per kunci, dedupe saat
 * bersamaan, auto-refresh, dan revalidate saat tab kembali fokus.
 *
 * Kunci = path API. Semua komponen yang memakai kunci sama berbagi satu entri,
 * jadi dua panel di satu halaman tidak mengirim dua request.
 */
import { fetcher } from '#lib/api.ts';

export interface QueryOptions {
	/** Jeda auto-refresh (ms). Kosong = tidak ada polling. */
	refreshInterval?: number;
	/** `false` = berhenti mencoba otomatis setelah gagal (tetap dicoba saat fokus). */
	shouldRetryOnError?: boolean;
	/** Tahan data kunci sebelumnya selama kunci baru dimuat (mis. ketikan filter). */
	keepPreviousData?: boolean;
	/** `false` = abaikan event fokus/online untuk kunci ini. */
	revalidateOnFocus?: boolean;
}

export interface QueryResult<T> {
	readonly data: T | undefined;
	readonly error: unknown;
	/** Belum ada data dan request sedang berjalan. */
	readonly isLoading: boolean;
	/** Ada request berjalan (dengan atau tanpa data lama). */
	readonly isValidating: boolean;
	/** Ganti data lokal tanpa request, atau paksa ambil ulang bila `data` kosong. */
	mutate: (data?: T, opts?: { revalidate?: boolean }) => Promise<void>;
}

interface Entry {
	key: string;
	data: unknown;
	error: unknown;
	promise: Promise<unknown> | null;
	controller: AbortController | null;
	lastSuccess: number;
	lastAttempt: number;
	subscribers: number;
	timer: ReturnType<typeof setInterval> | null;
	listeners: Set<() => void>;
	options: QueryOptions;
}

const entries = new Map<string, Entry>();

/** Jeda minimum antar request untuk kunci yang sama (pengganti dedupingInterval). */
const DEDUPE_MS = 1_000;

function entryFor(key: string, options: QueryOptions): Entry {
	let entry = entries.get(key);
	if (!entry) {
		entry = {
			key,
			data: undefined,
			error: null,
			promise: null,
			controller: null,
			lastSuccess: 0,
			lastAttempt: 0,
			subscribers: 0,
			timer: null,
			listeners: new Set(),
			options
		};
		entries.set(key, entry);
	}
	entry.options = options;
	return entry;
}

function notify(entry: Entry): void {
	for (const listener of entry.listeners) listener();
}

function stopTimer(entry: Entry): void {
	if (entry.timer !== null) {
		clearInterval(entry.timer);
		entry.timer = null;
	}
}

function ensureTimer(entry: Entry): void {
	const ms = entry.options.refreshInterval;
	if (!ms || entry.timer !== null) return;
	entry.timer = setInterval(() => {
		void refresh(entry);
	}, ms);
}

async function refresh(entry: Entry, force = false): Promise<unknown> {
	if (entry.promise) return entry.promise;
	const now = Date.now();
	if (!force && now - entry.lastAttempt < DEDUPE_MS) return entry.data;

	entry.lastAttempt = now;
	const controller = new AbortController();
	entry.controller = controller;

	entry.promise = fetcher(entry.key, controller.signal)
		.then((data) => {
			entry.data = data;
			entry.error = null;
			entry.lastSuccess = Date.now();
			return data;
		})
		.catch((error: unknown) => {
			if (controller.signal.aborted) return entry.data;
			entry.error = error;
			if (entry.options.shouldRetryOnError === false) stopTimer(entry);
			return entry.data;
		})
		.finally(() => {
			entry.promise = null;
			entry.controller = null;
			notify(entry);
		});

	return entry.promise;
}

/** Ganti isi cache satu kunci; `revalidate: false` mencegah request susulan. */
export async function mutateKey<T>(
	key: string,
	data?: T,
	opts: { revalidate?: boolean } = {}
): Promise<void> {
	const entry = entries.get(key);
	if (!entry) return;
	if (data !== undefined) {
		entry.data = data;
		entry.error = null;
		entry.lastSuccess = Date.now();
		notify(entry);
	}
	if (opts.revalidate !== false) await refresh(entry, true);
}

/** Ambil ulang semua kunci aktif yang cocok (pengganti `mutate(filter)` SWR). */
export function mutateMatch(match: (key: string) => boolean): void {
	for (const entry of entries.values()) {
		if (entry.subscribers > 0 && match(entry.key)) void refresh(entry, true);
	}
}

if (typeof window !== 'undefined') {
	const revalidateAll = () => {
		for (const entry of entries.values()) {
			if (entry.subscribers > 0 && entry.options.revalidateOnFocus !== false) {
				void refresh(entry);
			}
		}
	};
	window.addEventListener('focus', revalidateAll);
	window.addEventListener('online', revalidateAll);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') revalidateAll();
	});
}

/**
 * Query reaktif. `source` boleh berupa string atau getter — pakai getter kalau
 * kuncinya bergantung pada filter yang bisa berubah.
 */
export function createQuery<T>(
	source: string | null | (() => string | null),
	options: QueryOptions = {}
): QueryResult<T> {
	const key = $derived(typeof source === 'function' ? source() : source);

	const view = $state<{ data: T | undefined; error: unknown; validating: boolean }>({
		data: undefined,
		error: null,
		validating: false
	});

	let previous: Entry | null = null;

	$effect(() => {
		const current = key;

		if (current === null) {
			previous = null;
			view.validating = false;
			return;
		}

		const entry = entryFor(current, options);
		const carried =
			options.keepPreviousData && entry.data === undefined
				? (previous?.data as T | undefined)
				: undefined;
		previous = entry;

		view.data = (entry.data !== undefined ? entry.data : carried) as T | undefined;
		view.error = entry.error;
		view.validating = entry.promise !== null;

		const listener = () => {
			view.data = entry.data as T | undefined;
			view.error = entry.error;
			view.validating = entry.promise !== null;
		};

		entry.listeners.add(listener);
		entry.subscribers += 1;
		ensureTimer(entry);
		void refresh(entry);

		return () => {
			entry.listeners.delete(listener);
			entry.subscribers -= 1;
			if (entry.subscribers <= 0) {
				stopTimer(entry);
				entry.controller?.abort();
			}
		};
	});

	async function mutate(data?: T, opts: { revalidate?: boolean } = {}): Promise<void> {
		const current = key;
		if (current === null) return;
		const entry = entries.get(current);
		if (!entry) return;
		if (data !== undefined) {
			entry.data = data;
			entry.error = null;
			entry.lastSuccess = Date.now();
			notify(entry);
		}
		if (opts.revalidate !== false) await refresh(entry, true);
	}

	return {
		get data() {
			return view.data;
		},
		get error() {
			return view.error;
		},
		get isLoading() {
			return view.data === undefined && view.validating;
		},
		get isValidating() {
			return view.validating;
		},
		mutate
	};
}
