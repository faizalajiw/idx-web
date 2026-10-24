// Seluruh data diambil browser dari FastAPI, jadi tidak ada yang perlu dirender
// di server. Prerender dimatikan karena rute dinamis dilayani fallback SPA.
export const ssr = false;
export const prerender = false;
