// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	/** Variabel publik yang dibaca `src/lib/api.ts` saat build. */
	interface ImportMetaEnv {
		readonly PUBLIC_API_BASE_URL?: string;
	}
}

export {};
