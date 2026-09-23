"use client";

import { useEffect, useState } from "react";
import { marketStatus, type MarketState } from "@/lib/marketStatus";

const REFRESH = 30_000;

function badgeClass(status: MarketState["status"]): string {
  if (status === "OPEN") return "badge badge-buy";
  if (status === "PRE") return "badge badge-pre";
  return "badge badge-hold";
}

export function MarketBadge() {
  // Compute after mount to avoid SSR/hydration mismatch on minute boundaries.
  const [state, setState] = useState<MarketState | null>(null);

  useEffect(() => {
    setState(marketStatus());
    const id = setInterval(() => setState(marketStatus()), REFRESH);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return <span className="badge badge-hold">—</span>;
  }

  return (
    <span className={badgeClass(state.status)} title={state.detail}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {state.label} · {state.detail}
    </span>
  );
}
