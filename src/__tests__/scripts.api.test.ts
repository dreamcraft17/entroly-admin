/**
 * D-01: Script Library CRUD API Tests
 */

import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:4017";
const OPERATOR_TOKEN = process.env.TEST_OPERATOR_TOKEN ?? "";
const VIEWER_TOKEN = process.env.TEST_VIEWER_TOKEN ?? "";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const validScript = {
  text: "Hai! Aku mau rekomendasiin tempat seru banget buat kalian!",
  poiType: "ACC",
  language: "id",
  market: "IDN",
};

describe("GET /api/admin/scripts", () => {
  it("returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with valid token", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`, {
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("data");
  });

  it("filters by poiType", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts?poiType=FNB`, {
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    json.data.forEach((s: { poiType: string }) => {
      expect(s.poiType).toBe("FNB");
    });
  });
});

describe("POST /api/admin/scripts", () => {
  it("returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScript),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for VIEWER", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`, {
      method: "POST",
      headers: authHeaders(VIEWER_TOKEN),
      body: JSON.stringify(validScript),
    });
    expect(res.status).toBe(403);
  });

  it("returns 422 if text exceeds 500 chars", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`, {
      method: "POST",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ ...validScript, text: "a".repeat(501) }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid poiType", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`, {
      method: "POST",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ ...validScript, poiType: "INVALID" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 201 and writes audit log", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts`, {
      method: "POST",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify(validScript),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toHaveProperty("id");

    const log = await prisma.adminAuditLog.findFirst({
      where: { entityType: "SCRIPT", entityId: json.data.id, actionType: "CREATE" },
    });
    expect(log).not.toBeNull();

    await prisma.adminAuditLog.deleteMany({ where: { entityId: json.data.id } });
    await prisma.scriptLibrary.delete({ where: { id: json.data.id } });
  });
});

describe("PUT /api/admin/scripts/[id]", () => {
  let scriptId: string;

  beforeAll(async () => {
    const s = await prisma.scriptLibrary.create({ data: validScript });
    scriptId = s.id;
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({ where: { entityId: scriptId } });
    await prisma.scriptLibrary.deleteMany({ where: { id: scriptId } });
  });

  it("returns 404 for unknown id", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts/nonexistent`, {
      method: "PUT",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ text: "Updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 and writes audit log", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts/${scriptId}`, {
      method: "PUT",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ text: "Updated script text" }),
    });
    expect(res.status).toBe(200);

    const log = await prisma.adminAuditLog.findFirst({
      where: { entityType: "SCRIPT", entityId: scriptId, actionType: "UPDATE" },
    });
    expect(log).not.toBeNull();
  });
});

describe("DELETE /api/admin/scripts/[id]", () => {
  let scriptId: string;

  beforeAll(async () => {
    const s = await prisma.scriptLibrary.create({ data: { ...validScript, text: "To be deleted" } });
    scriptId = s.id;
  });

  it("returns 404 for unknown id", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts/nonexistent`, {
      method: "DELETE",
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(404);
  });

  it("returns 204 and writes audit log", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scripts/${scriptId}`, {
      method: "DELETE",
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(204);

    const log = await prisma.adminAuditLog.findFirst({
      where: { entityType: "SCRIPT", entityId: scriptId, actionType: "DELETE" },
    });
    expect(log).not.toBeNull();

    // Cleanup audit log
    await prisma.adminAuditLog.deleteMany({ where: { entityId: scriptId } });
  });
});
