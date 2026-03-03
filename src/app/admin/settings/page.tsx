"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function Toasts() {
    const searchParams = useSearchParams();
    const sellerError = searchParams.get("seller_error");

    return (
        <>
            {sellerError && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                    Error: {decodeURIComponent(sellerError)}
                </div>
            )}
        </>
    );
}

export default function SettingsPage() {
    return (
        <div className="max-w-2xl space-y-8">
            <h1 className="text-xl font-semibold text-white">Settings</h1>

            <Suspense fallback={null}>
                <Toasts />
            </Suspense>

            <p className="text-gray-500 text-sm">
                No settings available yet.
            </p>
        </div>
    );
}
