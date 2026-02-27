import { NextRequest, NextResponse } from "next/server";
import { Prisma, AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole, getClientIp } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { updateTemplateSchema } from "@/lib/validations/template";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/templates/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: template });
}

// PUT /api/admin/templates/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, AdminRole.OPERATOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const updateData: Prisma.TemplateUpdateInput = {
    ...(parsed.data.name !== undefined && { name: parsed.data.name }),
    ...(parsed.data.category !== undefined && { category: parsed.data.category }),
    ...(parsed.data.seedanceConfigJson !== undefined && {
      seedanceConfigJson: parsed.data.seedanceConfigJson as Prisma.InputJsonValue,
    }),
    ...(parsed.data.fallbackVendorConfigJson !== undefined && {
      fallbackVendorConfigJson: parsed.data.fallbackVendorConfigJson
        ? (parsed.data.fallbackVendorConfigJson as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    }),
    ...(parsed.data.sampleThumbnailUrl !== undefined && { sampleThumbnailUrl: parsed.data.sampleThumbnailUrl }),
    ...(parsed.data.performanceTags !== undefined && { performanceTags: parsed.data.performanceTags }),
    ...(parsed.data.performanceScore !== undefined && { performanceScore: parsed.data.performanceScore }),
  };

  const updated = await prisma.template.update({ where: { id }, data: updateData });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "UPDATE",
    entityType: "TEMPLATE",
    entityId: id,
    beforeValue: existing,
    afterValue: updated,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: updated });
}
