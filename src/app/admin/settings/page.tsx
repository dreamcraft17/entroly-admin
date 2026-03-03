"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface SellerStatus {
    connected: boolean;
    openId: string | null;
    expiresAt: string | null;
    expired: boolean | null;
}

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const sellerConnected = searchParams.get("seller_connected");
    const sellerError = searchParams.get("seller_error");

    const [status, setStatus] = useState<SellerStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/system/seller-status")
            .then((r) => r.json())
            .then((d) => setStatus(d))
            .catch(() => setStatus(null))
            .finally(() => setLoading(false));
    }, []);

    const expiryLabel = status?.expiresAt
        ? new Date(status.expiresAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

    return (
        <div className="max-w-2xl space-y-8">
            <h1 className="text-xl font-semibold text-white">Settings</h1>

            {/* Toast messages */}
            {sellerConnected && (
                <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded-lg px-4 py-3 text-sm">
                    TikTok Shop seller account connected successfully.
                </div>
            )}
            {sellerError && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                    Error: {decodeURIComponent(sellerError)}
                </div>
            )}

            {/* TikTok Shop Seller Connection */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-medium text-white">
                            TikTok Shop — ENTROPI Seller Account
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Connect ENTROPI&apos;s seller account once. All creator stats will be fetched
                            using this seller token via the Partner API.
                        </p>
                    </div>
                    <a
                        href="/api/admin/system/seller-auth"
                        className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {status?.connected ? "Reconnect" : "Connect Seller"}
                    </a>
                </div>

                <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
                    {loading ? (
                        <p className="text-gray-500">Checking connection...</p>
                    ) : status?.connected ? (
                        <>
                            <Row label="Status">
                                {status.expired ? (
                                    <span className="text-red-400">Expired — reconnect needed</span>
                                ) : (
                                    <span className="text-emerald-400">Connected</span>
                                )}
                            </Row>
                            <Row label="Open ID">{status.openId ?? "—"}</Row>
                            <Row label="Token expires">{expiryLabel}</Row>
                        </>
                    ) : (
                        <p className="text-gray-500">
                            No seller account connected. Click &quot;Connect Seller&quot; to authorize.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <span className="text-gray-500 w-32 shrink-0">{label}</span>
            <span className="text-gray-200">{children}</span>
        </div>
    );
}
