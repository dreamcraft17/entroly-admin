import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  verifyAdminToken: jest.fn(),
  hasMinRole: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockUser = { id: "user1", email: "admin@test.com", name: "Admin", adminRole: "OPERATOR" as const };
const mockCampaign = {
  id: "c1",
  name: "Test Campaign",
  description: null,
  targetPoiTypes: ["FNB"],
  requiredPosts: 3,
  creditReward: "50000.0000",
  currency: "IDR",
  startDate: new Date("2026-03-01"),
  endDate: new Date("2026-03-31"),
  maxParticipants: null,
  maxTotalCredits: null,
  totalCredited: "0.0000",
  frequency: "ONE_TIME",
  status: "DRAFT",
  autoPublish: false,
  createdBy: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAdminToken as jest.Mock).mockResolvedValue(mockUser);
  (hasMinRole as jest.Mock).mockReturnValue(true);
});

describe("GET /api/admin/campaigns", () => {
  it("returns campaign list", async () => {
    const { GET } = await import("@/app/api/admin/campaigns/route");
    (prisma.campaign.findMany as jest.Mock).mockResolvedValue([mockCampaign]);

    const req = new NextRequest("http://localhost/api/admin/campaigns");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("returns 401 when unauthenticated", async () => {
    (verifyAdminToken as jest.Mock).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/campaigns/route");
    const req = new NextRequest("http://localhost/api/admin/campaigns");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/campaigns", () => {
  it("creates a campaign with valid payload", async () => {
    const { POST } = await import("@/app/api/admin/campaigns/route");
    (prisma.campaign.create as jest.Mock).mockResolvedValue(mockCampaign);

    const req = new NextRequest("http://localhost/api/admin/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Campaign",
        targetPoiTypes: ["FNB"],
        requiredPosts: 3,
        creditReward: 50000,
        currency: "IDR",
        startDate: "2026-03-01T00:00:00Z",
        endDate: "2026-03-31T23:59:59Z",
        frequency: "ONE_TIME",
        autoPublish: false,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 400 for invalid payload (missing targetPoiTypes)", async () => {
    const { POST } = await import("@/app/api/admin/campaigns/route");

    const req = new NextRequest("http://localhost/api/admin/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad Campaign",
        requiredPosts: 3,
        creditReward: 50000,
        startDate: "2026-03-01T00:00:00Z",
        endDate: "2026-03-31T23:59:59Z",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/campaigns/[id] — status transitions", () => {
  it("publishes a DRAFT campaign", async () => {
    const { PATCH } = await import("@/app/api/admin/campaigns/[id]/route");
    (prisma.campaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
    (prisma.campaign.update as jest.Mock).mockResolvedValue({ ...mockCampaign, status: "ACTIVE" });

    const req = new NextRequest("http://localhost/api/admin/campaigns/c1", {
      method: "PATCH",
      body: JSON.stringify({ action: "publish" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: { id: "c1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ACTIVE");
  });

  it("rejects invalid action", async () => {
    const { PATCH } = await import("@/app/api/admin/campaigns/[id]/route");
    (prisma.campaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);

    const req = new NextRequest("http://localhost/api/admin/campaigns/c1", {
      method: "PATCH",
      body: JSON.stringify({ action: "delete" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: { id: "c1" } });
    expect(res.status).toBe(400);
  });

  it("rejects invalid status transition", async () => {
    const { PATCH } = await import("@/app/api/admin/campaigns/[id]/route");
    (prisma.campaign.findUnique as jest.Mock).mockResolvedValue({ ...mockCampaign, status: "CLOSED" });

    const req = new NextRequest("http://localhost/api/admin/campaigns/c1", {
      method: "PATCH",
      body: JSON.stringify({ action: "publish" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: { id: "c1" } });
    expect(res.status).toBe(409);
  });
});
