import type { Metadata } from "next";
import { DecisionWorkspace } from "./DecisionWorkspace";

export const metadata: Metadata = { title: "Ruang Keputusan" };

/** /keputusan — tanpa emiten: pemilih + empty state. */
export default function KeputusanIndexPage() {
  return <DecisionWorkspace code={null} />;
}
