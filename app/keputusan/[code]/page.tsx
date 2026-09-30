import type { Metadata } from "next";
import { DecisionWorkspace } from "../DecisionWorkspace";

export const metadata: Metadata = { title: "Ruang Keputusan" };

/** /keputusan/[code] — deep-link emiten, mis. /keputusan/BBRI. */
export default async function KeputusanStockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <DecisionWorkspace code={code.toUpperCase()} />;
}
