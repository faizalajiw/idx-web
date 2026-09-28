/**
 * Peta kode emiten IDX → domain perusahaan, dipakai untuk mengambil logo via
 * Clearbit Logo API (gratis, tanpa API key): https://logo.clearbit.com/{domain}
 *
 * Hanya perlu diisi untuk emiten yang ingin menampilkan logo asli. Kode yang
 * tidak ada di sini otomatis pakai monogram (lihat TickerLogo). Silakan tambah
 * sesuai kebutuhan — cukup baris `CODE: "domain.com"`.
 */
export const TICKER_DOMAINS: Record<string, string> = {
  // Bank
  BBCA: "bca.co.id",
  BBRI: "bri.co.id",
  BMRI: "bankmandiri.co.id",
  BBNI: "bni.co.id",
  BRIS: "bankbsi.co.id",
  BBTN: "btn.co.id",
  ARTO: "bankjago.com",
  BJBR: "bankbjb.co.id",
  BNGA: "cimbniaga.co.id",
  BDMN: "danamon.co.id",
  PNBN: "panin.co.id",
  MEGA: "bankmega.com",

  // Telko & tower
  TLKM: "telkom.co.id",
  ISAT: "ioh.co.id",
  EXCL: "xlaxiata.co.id",
  TOWR: "sarana-menara.co.id",
  TBIG: "tower-bersama.com",
  MTEL: "mitratel.co.id",

  // Konsumer
  UNVR: "unilever.co.id",
  ICBP: "indofoodcbp.com",
  INDF: "indofood.com",
  MYOR: "mayoraindah.co.id",
  GGRM: "gudanggaramtbk.com",
  HMSP: "sampoerna.com",
  KLBF: "kalbe.co.id",
  SIDO: "sidomuncul.co.id",
  AMRT: "alfamart.co.id",
  MAPI: "map.co.id",
  MAPA: "map-active.com",
  CPIN: "charoenpokphand.co.id",
  JPFA: "japfacomfeed.co.id",

  // Energi & tambang
  ADRO: "adaro.com",
  PGAS: "pgn.co.id",
  PTBA: "ptba.co.id",
  ITMG: "itmg.co.id",
  MEDC: "medcoenergi.com",
  ANTM: "antam.com",
  INCO: "vale.com",
  TINS: "timah.com",
  MDKA: "merdekacoppergold.com",
  HRUM: "harumenergy.com",
  INDY: "indikaenergy.co.id",
  AKRA: "akr.co.id",

  // Otomotif & industri
  ASII: "astra.co.id",
  UNTR: "unitedtractors.com",
  SMGR: "sig.id",
  INTP: "indocement.co.id",
  INKP: "asiapulppaper.com",
  TKIM: "asiapulppaper.com",
  BRPT: "barito-pacific.com",
  TPIA: "chandra-asri.com",

  // Properti & konstruksi
  BSDE: "sinarmasland.com",
  CTRA: "ciputra.com",
  PWON: "pakuwonjati.com",
  SMRA: "summarecon.com",
  PTPP: "ptpp.co.id",
  WIKA: "wika.co.id",
  ADHI: "adhi.co.id",

  // Teknologi & digital
  GOTO: "gotocompany.com",
  BUKA: "bukalapak.com",
  EMTK: "emtek.co.id",
  MTDL: "metrodata.co.id",

  // Ritel & lainnya
  ACES: "aceshardware.co.id",
  ERAA: "erajaya.com",
  RALS: "ramayana.co.id",
  BFIN: "bfi.co.id",
  BUMI: "bumiresources.com",
  JSMR: "jasamarga.com",
  GIAA: "garuda-indonesia.com",
  ELSA: "elnusa.co.id",
  PGEO: "pertaminageothermal.com",
};

/** Ambil domain untuk kode emiten (uppercase-insensitive). */
export function domainFor(code: string): string | undefined {
  return TICKER_DOMAINS[code.toUpperCase()];
}
