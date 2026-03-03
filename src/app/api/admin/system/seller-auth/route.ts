/**
 * GET /api/admin/system/seller-auth
 * Initiates TikTok Shop SELLER OAuth for ENTROPI's own seller account.
 * This is a one-time setup — no user_type param (seller flow, not creator).
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { AdminRole } from "@prisma/client";

const TIKTOK_SHOP_AUTH_URL = "https://auth.tiktok-shops.com/oauth/authorize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const admin = await verifyAdminToken(request);
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasMinRole(admin.adminRole, AdminRole.SUPER_ADMIN)) {
        return NextResponse.json({ error: "Forbidden — SUPER_ADMIN required" }, { status: 403 });
    }

    const appKey = process.env.TIKTOK_SHOP_APP_KEY;
    if (!appKey) {
        return NextResponse.json({ error: "TIKTOK_SHOP_APP_KEY not configured" }, { status: 500 });
    }

    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.entro.ly";
    const redirectUri = `${adminUrl}/api/admin/system/seller-callback`;

    // Use short-lived state token — store in cookie since no Redis in admin
    const state = randomBytes(16).toString("hex");
    const url = `${TIKTOK_SHOP_AUTH_URL}?app_key=${appKey}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log("[seller-auth] initiating seller OAuth, admin=%s", admin.email);

    const res = NextResponse.redirect(url);
    // Store state in cookie to verify on callback (15 min TTL)
    res.cookies.set("shop_seller_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 900,
        path: "/",
    });
    return res;
}
