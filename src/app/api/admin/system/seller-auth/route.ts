/**
 * GET /api/admin/system/seller-auth
 * Initiates TikTok Shop Partner Center OAuth for ENTROPI's partner/affiliate account.
 * Uses service_id from Partner Center app — NOT the seller center flow.
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { AdminRole } from "@prisma/client";

// Partner Center authorization URL — for ROW (rest of world) markets
// US market would use: https://services.tiktokshops.us/open/authorize
const TIKTOK_SHOP_AUTH_URL = "https://services.tiktokshop.com/open/authorize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const admin = await verifyAdminToken(request);
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasMinRole(admin.adminRole, AdminRole.SUPER_ADMIN)) {
        return NextResponse.json({ error: "Forbidden — SUPER_ADMIN required" }, { status: 403 });
    }

    // service_id from Partner Center app page (not app_key)
    const serviceId = process.env.TIKTOK_SHOP_SERVICE_ID;
    if (!serviceId) {
        return NextResponse.json({ error: "TIKTOK_SHOP_SERVICE_ID not configured" }, { status: 500 });
    }

    // Use short-lived state token — store in cookie since no Redis in admin
    const state = randomBytes(16).toString("hex");
    const url = `${TIKTOK_SHOP_AUTH_URL}?service_id=${serviceId}&state=${encodeURIComponent(state)}`;

    console.log("[seller-auth] initiating Partner Center OAuth, admin=%s", admin.email);

    const res = NextResponse.redirect(url);
    // Store state in cookie to verify on callback (15 min TTL)
    res.cookies.set("tts_partner_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 900,
        path: "/",
    });
    return res;
}
