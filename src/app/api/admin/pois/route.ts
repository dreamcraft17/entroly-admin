import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";

// GET /api/admin/pois
export async function GET(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "VIEWER"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const market = searchParams.get("market");
  const active = searchParams.get("active");

  const pois = await prisma.poi.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(market ? { market } : {}),
      ...(active !== null ? { isActive: active === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(pois);
}
