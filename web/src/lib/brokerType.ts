/**
 * Broker type classification: Asing (foreign), Lokal (domestic private), BUMN (state-owned).
 * Based on broker ownership as of 2026.
 */

export type BrokerType = "asing" | "lokal" | "bumn";

const BUMN_NAMES = [
  "mandiri sekuritas",
  "bni sekuritas",
  "bri danareksa",
  "bahana sekuritas",
  "danareksa",
];

const ASING_NAMES = [
  "ubs",
  "cgs international",
  "cls",
  "j.p. morgan",
  "jp morgan",
  "macquarie",
  "maybank",
  "mirae asset",
  "nh korindo",
  "ocbc",
  "phillip",
  "rhb",
  "shinhan",
  "yuanta",
  "kiwoom",
  "korea investment",
  "kb valbury",
  "kgi",
  "dbs vickers",
  "goldman",
  "morgan stanley",
  "nomura",
  "hsbc",
  "bnp paribas",
  "jefferies",
  "credit suisse",
  "deutsche",
];

function matchAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function getBrokerType(name: string | null | undefined): BrokerType {
  if (!name) return "lokal";
  if (matchAny(name, BUMN_NAMES)) return "bumn";
  if (matchAny(name, ASING_NAMES)) return "asing";
  return "lokal";
}

export const BROKER_TYPE_META: Record<
  BrokerType,
  { label: string; color: string; twClass: string }
> = {
  asing: {
    label: "Asing",
    color: "#3b82f6", // blue-500
    twClass: "text-blue-400",
  },
  lokal: {
    label: "Lokal",
    color: "#a855f7", // purple-500
    twClass: "text-purple-400",
  },
  bumn: {
    label: "BUMN",
    color: "#ef4444", // red-500
    twClass: "text-red-400",
  },
};
