"use client";

import { useState } from "react";
import { testTelegram } from "@/lib/api";
import { useAlerts } from "@/lib/hooks";
import { Card } from "./Card";
import { ErrorState, Skeleton } from "./States";

/**
 * Telegram wiring check. Alerts are useless if the bot is not reachable, and
 * "nothing happened" looks identical to "wrong chat id", so this panel lets the
 * user fire one real message and see the outcome.
 */
export function TelegramStatus() {
  const { data, error, isLoading } = useAlerts();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  const enabled = data?.telegram_enabled ?? false;

  async function handleTest() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await testTelegram();
      setResult({ ok: res.sent, detail: res.detail });
    } catch (e) {
      setResult({
        ok: false,
        detail: e instanceof Error ? e.message : "Gagal mengirim pesan uji",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Koneksi Telegram"
      subtitle="Tujuan pengiriman notifikasi aturan di samping"
      right={
        data ? (
          <span className={enabled ? "badge badge-buy" : "badge badge-warn"}>
            {enabled ? "Terhubung" : "Belum diatur"}
          </span>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={`Gagal memeriksa status: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-3">
          {enabled ? (
            <p className="text-muted text-sm leading-relaxed">
              Bot dan chat id sudah terbaca dari <code>.env</code>. Kirim satu pesan uji
              untuk memastikan notifikasi benar-benar sampai.
            </p>
          ) : (
            <>
              <p className="text-muted text-sm leading-relaxed">
                Notifikasi belum aktif. Isi dua variabel ini di{" "}
                <code>idx-scraper/.env</code> lalu restart API:
              </p>
              <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card-solid)] p-3 text-xs">
                {"TELEGRAM_BOT_TOKEN=123456:ABC…\nTELEGRAM_CHAT_ID=123456789"}
              </pre>
              <p className="text-muted text-xs leading-relaxed">
                Bikin bot lewat @BotFather di Telegram, lalu kirim pesan apa saja ke bot
                itu dan ambil chat id-nya. Aturan tetap tersimpan dan dievaluasi walau
                Telegram belum diisi — cuma notifikasinya yang belum terkirim.
              </p>
            </>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleTest()}
            disabled={!enabled || busy}
            title={enabled ? undefined : "Isi TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID dulu"}
          >
            {busy ? "Mengirim…" : "Kirim pesan uji"}
          </button>

          {result && (
            <p className={`text-sm ${result.ok ? "text-up" : "text-down"}`}>
              {result.detail}
            </p>
          )}
          {!enabled && (
            <p className="text-muted text-xs">
              Tombol uji aktif setelah <code>.env</code> terisi.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
