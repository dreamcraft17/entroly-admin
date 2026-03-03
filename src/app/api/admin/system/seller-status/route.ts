/**
 * GET /api/admin/system/seller-status
 * Returns ENTROPI's TikTok Shop seller token status.
 * Requires ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const admin = await verifyAdminToken(request);
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasMinRole(admin.adminRole, AdminRole.ADMIN)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany({
        where: {
            key: {
                in: [
                    "tiktok_shop_seller_access_token",
                    "tiktok_shop_seller_expires_at",
                    "tiktok_shop_seller_open_id",
                ],
            },
        },
    });

    const map = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const hasToken = !!map["tiktok_shop_seller_access_token"];
    const expiresAt = map["tiktok_shop_seller_expires_at"]
        ? Number(map["tiktok_shop_seller_expires_at"])
        : null;
    const isExpired = expiresAt ? expiresAt < Math.floor(Date.now() / 1000) : null;

    return NextResponse.json({
        connected: hasToken,
        openId: map["tiktok_shop_seller_open_id"] ?? null,
        expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
        expired: isExpired,
    });
}
