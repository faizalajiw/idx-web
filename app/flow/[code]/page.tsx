import type { Metadata } from "next";
import { FlowWorkspace } from "../FlowWorkspace";

export const metadata: Metadata = { title: "Aliran Dana Emiten" };

/** /flow/[code] — deep-link emiten, mis. /flow/BBRI. */
export default async function FlowStockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <FlowWorkspace code={code.toUpperCase()} />;
}
