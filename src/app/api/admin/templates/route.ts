import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole, getClientIp } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createTemplateSchema } from "@/lib/validations/template";
import { AdminRole } from "@prisma/client";

// GET /api/admin/templates — list templates
export async function GET(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const isActive = searchParams.get("isActive");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const where: Prisma.TemplateWhereInput = {
    ...(category ? { category } : {}),
    ...(isActive !== null ? { isActive: isActive === "true" } : {}),
  };

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.template.count({ where }),
  ]);

  return NextResponse.json({ data: templates, total, page, limit });
}

// POST /api/admin/templates — create template
export async function POST(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, AdminRole.OPERATOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const template = await prisma.template.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      seedanceConfigJson: parsed.data.seedanceConfigJson as Prisma.InputJsonValue,
      fallbackVendorConfigJson: parsed.data.fallbackVendorConfigJson
        ? (parsed.data.fallbackVendorConfigJson as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      sampleThumbnailUrl: parsed.data.sampleThumbnailUrl ?? undefined,
      performanceTags: parsed.data.performanceTags,
      performanceScore: parsed.data.performanceScore ?? undefined,
      createdBy: user.id,
    },
  });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "CREATE",
    entityType: "TEMPLATE",
    entityId: template.id,
    afterValue: template,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
