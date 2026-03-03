import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { CampaignUpdateSchema } from "@/lib/validations/campaign";
import { Prisma } from "@prisma/client";

// GET /api/admin/campaigns/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "VIEWER"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(campaign);
}

// PUT /api/admin/campaigns/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "OPERATOR"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const before = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (before.status === "CLOSED")
    return NextResponse.json({ error: "Cannot edit a closed campaign" }, { status: 409 });

  const body = await req.json();
  const parsed = CampaignUpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.targetPoiTypes !== undefined ? { targetPoiTypes: d.targetPoiTypes } : {}),
      ...(d.requiredPosts !== undefined ? { requiredPosts: d.requiredPosts } : {}),
      ...(d.creditReward !== undefined ? { creditReward: new Prisma.Decimal(d.creditReward) } : {}),
      ...(d.currency !== undefined ? { currency: d.currency } : {}),
      ...(d.startDate !== undefined ? { startDate: new Date(d.startDate) } : {}),
      ...(d.endDate !== undefined ? { endDate: new Date(d.endDate) } : {}),
      ...(d.maxParticipants !== undefined ? { maxParticipants: d.maxParticipants ?? null } : {}),
      ...(d.maxTotalCredits !== undefined
        ? { maxTotalCredits: d.maxTotalCredits ? new Prisma.Decimal(d.maxTotalCredits) : null }
        : {}),
      ...(d.frequency !== undefined ? { frequency: d.frequency } : {}),
      ...(d.autoPublish !== undefined ? { autoPublish: d.autoPublish } : {}),
    },
  });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "UPDATE",
    entityType: "Campaign",
    entityId: params.id,
    beforeValue: before as unknown as Record<string, unknown>,
    afterValue: updated as unknown as Record<string, unknown>,
  });

  return NextResponse.json(updated);
}

// PATCH /api/admin/campaigns/[id] — status transitions (publish/pause/close)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "OPERATOR"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { action } = await req.json();
  if (!["publish", "pause", "close"].includes(action))
    return NextResponse.json({ error: "action must be publish | pause | close" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
    publish: { from: ["DRAFT", "PAUSED"], to: "ACTIVE" },
    pause:   { from: ["ACTIVE"],          to: "PAUSED" },
    close:   { from: ["ACTIVE", "PAUSED", "DRAFT"], to: "CLOSED" },
  };

  const transition = TRANSITIONS[action];
  if (!transition.from.includes(campaign.status))
    return NextResponse.json(
      { error: `Cannot ${action} a campaign with status ${campaign.status}` },
      { status: 409 }
    );

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: { status: transition.to as "ACTIVE" | "PAUSED" | "CLOSED" },
  });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: `CAMPAIGN_${action.toUpperCase()}`,
    entityType: "Campaign",
    entityId: params.id,
    beforeValue: { status: campaign.status },
    afterValue: { status: updated.status },
  });

  return NextResponse.json(updated);
}
