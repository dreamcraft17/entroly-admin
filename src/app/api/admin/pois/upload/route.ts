import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PassThrough } from "stream";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";

const VALID_TYPES = ["ACC", "TTD", "FNB"];
const VALID_MARKETS = ["IDN", "US", "SGP"];

interface PoiRow {
  externalId: string;
  name: string;
  type: string;
  market: string;
  address?: string;
  city?: string;
}

interface RowError {
  row: number;
  externalId?: string;
  message: string;
}

function parseRow(row: ExcelJS.Row, rowNum: number): { data: PoiRow; error: null } | { data: null; error: RowError } {
  const cells = row.values as (string | undefined)[];
  // columns: externalId, name, type, market, address, city (1-indexed, index 0 is unused)
  const externalId = String(cells[1] ?? "").trim();
  const name = String(cells[2] ?? "").trim();
  const type = String(cells[3] ?? "").trim().toUpperCase();
  const market = String(cells[4] ?? "").trim().toUpperCase();
  const address = String(cells[5] ?? "").trim() || undefined;
  const city = String(cells[6] ?? "").trim() || undefined;

  if (!externalId) return { data: null, error: { row: rowNum, message: "externalId is required" } };
  if (!name) return { data: null, error: { row: rowNum, externalId, message: "name is required" } };
  if (!VALID_TYPES.includes(type))
    return { data: null, error: { row: rowNum, externalId, message: `type must be one of ${VALID_TYPES.join(", ")}` } };
  if (!VALID_MARKETS.includes(market))
    return { data: null, error: { row: rowNum, externalId, message: `market must be one of ${VALID_MARKETS.join(", ")}` } };

  return { data: { externalId, name, type, market, address, city }, error: null };
}

// POST /api/admin/pois/upload — dry-run
export async function POST(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "OPERATOR"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["csv", "xlsx", "xls"].includes(ext))
    return NextResponse.json({ error: "File must be .csv, .xlsx, or .xls" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = new ExcelJS.Workbook();
  try {
    if (ext === "csv") {
      const readable = new PassThrough();
      readable.end(buffer);
      await workbook.csv.read(readable);
    } else {
      await workbook.xlsx.load(buffer);
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 });
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  // Parse all rows (skip header row 1)
  const parsed: PoiRow[] = [];
  const errors: RowError[] = [];
  const fileExternalIds = new Set<string>();

  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const result = parseRow(row, rowNum);
    if (result.error) {
      errors.push(result.error);
    } else {
      if (fileExternalIds.has(result.data.externalId)) {
        errors.push({ row: rowNum, externalId: result.data.externalId, message: "Duplicate externalId in file" });
      } else {
        fileExternalIds.add(result.data.externalId);
        parsed.push(result.data);
      }
    }
  });

  // Fetch existing POIs by externalId
  const existingPois = await prisma.poi.findMany({
    where: { externalId: { in: [...fileExternalIds] } },
  });
  const existingMap = new Map(existingPois.map((p) => [p.externalId!, p]));

  // All active POIs in DB (to find deactivated)
  const allActivePois = await prisma.poi.findMany({ where: { isActive: true } });

  const added: PoiRow[] = [];
  const updated: (PoiRow & { changes: string[] })[] = [];

  for (const row of parsed) {
    const existing = existingMap.get(row.externalId);
    if (!existing) {
      added.push(row);
    } else {
      const changes: string[] = [];
      if (existing.name !== row.name) changes.push(`name: "${existing.name}" → "${row.name}"`);
      if (existing.type !== row.type) changes.push(`type: ${existing.type} → ${row.type}`);
      if (existing.market !== row.market) changes.push(`market: ${existing.market} → ${row.market}`);
      if ((existing.address ?? "") !== (row.address ?? "")) changes.push(`address updated`);
      if ((existing.city ?? "") !== (row.city ?? "")) changes.push(`city updated`);
      if (!existing.isActive) changes.push("reactivated");
      if (changes.length > 0) updated.push({ ...row, changes });
    }
  }

  // Deactivated = active in DB but not in the file
  const deactivated = allActivePois.filter(
    (p) => p.externalId && !fileExternalIds.has(p.externalId)
  ).map((p) => ({ externalId: p.externalId!, name: p.name, type: p.type, market: p.market }));

  return NextResponse.json({
    summary: {
      added: added.length,
      updated: updated.length,
      deactivated: deactivated.length,
      errors: errors.length,
    },
    added,
    updated,
    deactivated,
    errors,
  });
}
