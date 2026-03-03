import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { CampaignCreateSchema } from "@/lib/validations/campaign";
import { Prisma } from "@prisma/client";

// GET /api/admin/campaigns
export async function GET(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "VIEWER"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const campaigns = await prisma.campaign.findMany({
    where: status ? { status: status as Prisma.EnumCampaignStatusFilter } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

// POST /api/admin/campaigns
export async function POST(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "OPERATOR"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const parsed = CampaignCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const campaign = await prisma.campaign.create({
    data: {
      name: d.name,
      description: d.description,
      targetPoiTypes: d.targetPoiTypes,
      requiredPosts: d.requiredPosts,
      creditReward: new Prisma.Decimal(d.creditReward),
      currency: d.currency,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      maxParticipants: d.maxParticipants ?? null,
      maxTotalCredits: d.maxTotalCredits ? new Prisma.Decimal(d.maxTotalCredits) : null,
      frequency: d.frequency,
      autoPublish: d.autoPublish,
      createdBy: user.id,
    },
  });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "CREATE",
    entityType: "Campaign",
    entityId: campaign.id,
    afterValue: campaign as unknown as Record<string, unknown>,
  });

  return NextResponse.json(campaign, { status: 201 });
}
