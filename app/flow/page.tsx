import type { Metadata } from "next";
import { FlowWorkspace } from "./FlowWorkspace";

export const metadata: Metadata = { title: "Aliran Dana Emiten" };

/** /flow — tanpa emiten: pemilih + empty state. */
export default function FlowIndexPage() {
  return <FlowWorkspace code={null} />;
}
