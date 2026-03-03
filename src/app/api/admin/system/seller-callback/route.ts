/**
 * GET /api/admin/system/seller-callback
 * Receives TikTok Shop seller OAuth callback.
 * Exchanges code for tokens and stores in SystemConfig table.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

const TIKTOK_SHOP_TOKEN_URL = "https://auth.tiktok-shops.com/api/v2/token/get";

export const dynamic = "force-dynamic";

function generateSignature(
    path: string,
    params: Record<string, string>,
    appSecret: string
): string {
    const sortedParams = Object.entries(params)
        .filter(([k]) => k !== "access_token" && k !== "sign")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}${v}`)
        .join("");
    const input = `${appSecret}${path}${sortedParams}${appSecret}`;
    return createHmac("sha256", appSecret).update(input).digest("hex");
}

export async function GET(request: NextRequest) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.entro.ly";
    const settingsUrl = `${adminUrl}/admin/settings`;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state") || "";
    const error = searchParams.get("error");

    // Verify CSRF state via cookie
    const stateCookie = request.cookies.get("tts_partner_state")?.value;
    if (!stateCookie || stateCookie !== stateParam) {
        console.error("[seller-callback] CSRF state mismatch — cookie=%s param=%s", stateCookie, stateParam);
        return NextResponse.redirect(`${settingsUrl}?seller_error=State+mismatch`);
    }

    if (error || !code) {
        console.log("[seller-callback] OAuth denied or no code: error=%s", error);
        return NextResponse.redirect(`${settingsUrl}?seller_error=${encodeURIComponent(error || "No code received")}`);
    }

    const appKey = process.env.TIKTOK_SHOP_APP_KEY;
    const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;
    if (!appKey || !appSecret) {
        return NextResponse.redirect(`${adminUrl}/settings?seller_error=App+credentials+not+configured`);
    }

    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const path = "/api/v2/token/get";
        const params: Record<string, string> = {
            app_key: appKey,
            app_secret: appSecret,
            auth_code: code,
            grant_type: "authorized_code",
            timestamp: String(timestamp),
        };
        const sign = generateSignature(path, params, appSecret);

        const url = new URL(TIKTOK_SHOP_TOKEN_URL);
        for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
        }
        url.searchParams.set("sign", sign);

        console.log("[seller-callback] exchanging code for seller token...");
        const res = await fetch(url.toString(), { method: "GET" });
        const text = await res.text();
        console.log("[seller-callback] token response:", text.slice(0, 500));

        const data = JSON.parse(text) as {
            code: number;
            message: string;
            data: {
                access_token: string;
                refresh_token?: string;
                open_id: string;
                access_token_expire_in?: number;
                refresh_token_expire_in?: number;
                expire_in?: number;
            };
        };

        if (data.code !== 0) {
            throw new Error(`TikTok Shop token error: ${data.message} (${data.code})`);
        }

        const token = data.data;
        const expiresAt = token.access_token_expire_in ?? Math.floor(Date.now() / 1000) + 86400;

        // Store seller token in SystemConfig
        await prisma.$transaction([
            prisma.systemConfig.upsert({
                where: { key: "tiktok_shop_seller_access_token" },
                update: { value: token.access_token },
                create: { key: "tiktok_shop_seller_access_token", value: token.access_token },
            }),
            prisma.systemConfig.upsert({
                where: { key: "tiktok_shop_seller_refresh_token" },
                update: { value: token.refresh_token ?? "" },
                create: { key: "tiktok_shop_seller_refresh_token", value: token.refresh_token ?? "" },
            }),
            prisma.systemConfig.upsert({
                where: { key: "tiktok_shop_seller_expires_at" },
                update: { value: String(expiresAt) },
                create: { key: "tiktok_shop_seller_expires_at", value: String(expiresAt) },
            }),
            prisma.systemConfig.upsert({
                where: { key: "tiktok_shop_seller_open_id" },
                update: { value: token.open_id },
                create: { key: "tiktok_shop_seller_open_id", value: token.open_id },
            }),
        ]);

        console.log("[seller-callback] seller token stored ✓ open_id=%s", token.open_id);

        const redirect = NextResponse.redirect(`${settingsUrl}?seller_connected=1`);
        redirect.cookies.delete("tts_partner_state");
        return redirect;

    } catch (err) {
        console.error("[seller-callback] ERROR:", err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.redirect(`${settingsUrl}?seller_error=${encodeURIComponent(msg)}`);
    }
}
