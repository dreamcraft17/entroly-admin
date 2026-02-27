"use client";

import { useState, useRef } from "react";

interface PoiRow {
  externalId: string;
  name: string;
  type: string;
  market: string;
  address?: string;
  city?: string;
}

interface DryRunResult {
  summary: { added: number; updated: number; deactivated: number; errors: number };
  added: PoiRow[];
  updated: (PoiRow & { changes: string[] })[];
  deactivated: { externalId: string; name: string; type: string; market: string }[];
  errors: { row: number; externalId?: string; message: string }[];
}

export default function PoisPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setDryRun(null);
    setCommitted(false);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/pois/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);

    if (!res.ok) { setError(json.error ?? "Upload failed"); return; }
    setDryRun(json);
  }

  async function handleCommit() {
    if (!dryRun) return;
    setCommitting(true);
    setError("");

    const res = await fetch("/api/admin/pois/upload/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey,
        added: dryRun.added,
        updated: dryRun.updated,
        deactivatedExternalIds: dryRun.deactivated.map((d) => d.externalId),
      }),
    });
    const json = await res.json();
    setCommitting(false);

    if (!res.ok) { setError(json.error ?? "Commit failed"); return; }
    setCommitted(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">POI List Upload</h1>
      </div>

      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
        <p className="text-sm text-gray-400">
          Upload a <strong className="text-gray-300">CSV or XLSX</strong> file with columns:{" "}
          <code className="text-indigo-400">externalId, name, type, market, address, city</code>
        </p>
        <p className="text-xs text-gray-500">
          Valid types: ACC, TTD, FNB &nbsp;|&nbsp; Valid markets: IDN, US, SGP
        </p>

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-gray-700 file:text-white file:text-sm file:cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {uploading ? "Parsing..." : "Preview (Dry Run)"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950 border border-red-800 rounded text-sm text-red-400">{error}</div>
        )}
      </div>

      {dryRun && !committed && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "To Add", count: dryRun.summary.added, color: "text-green-400" },
              { label: "To Update", count: dryRun.summary.updated, color: "text-yellow-400" },
              { label: "To Deactivate", count: dryRun.summary.deactivated, color: "text-orange-400" },
              { label: "Errors", count: dryRun.summary.errors, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="p-3 bg-gray-900 border border-gray-800 rounded text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Errors */}
          {dryRun.errors.length > 0 && (
            <div className="p-4 bg-gray-900 border border-red-800 rounded-lg">
              <h3 className="text-sm font-medium text-red-400 mb-2">Parse Errors</h3>
              <ul className="space-y-1">
                {dryRun.errors.map((e, i) => (
                  <li key={i} className="text-xs text-gray-400">
                    Row {e.row}{e.externalId ? ` (${e.externalId})` : ""}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Added */}
          {dryRun.added.length > 0 && (
            <PoiTable title="New POIs" rows={dryRun.added} color="green" />
          )}

          {/* Updated */}
          {dryRun.updated.length > 0 && (
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-400 mb-3">Updated ({dryRun.updated.length})</h3>
              <table className="w-full text-xs text-gray-300">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2">External ID</th>
                    <th className="text-left pb-2">Name</th>
                    <th className="text-left pb-2">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRun.updated.map((r) => (
                    <tr key={r.externalId} className="border-b border-gray-800/50">
                      <td className="py-1.5 pr-4 font-mono">{r.externalId}</td>
                      <td className="py-1.5 pr-4">{r.name}</td>
                      <td className="py-1.5 text-yellow-400">{r.changes.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Deactivated */}
          {dryRun.deactivated.length > 0 && (
            <PoiTable title="Deactivated" rows={dryRun.deactivated} color="orange" />
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCommit}
              disabled={committing || dryRun.summary.errors > 0}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {committing ? "Committing..." : "Confirm & Commit"}
            </button>
            {dryRun.summary.errors > 0 && (
              <span className="text-xs text-red-400">Fix errors before committing</span>
            )}
            <button
              onClick={() => { setDryRun(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {committed && (
        <div className="p-4 bg-green-950 border border-green-800 rounded-lg text-sm text-green-400">
          Upload committed successfully.
        </div>
      )}
    </div>
  );
}

function PoiTable({
  title,
  rows,
  color,
}: {
  title: string;
  rows: { externalId: string; name: string; type: string; market: string }[];
  color: "green" | "orange";
}) {
  const cls = color === "green" ? "text-green-400" : "text-orange-400";
  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
      <h3 className={`text-sm font-medium ${cls} mb-3`}>{title} ({rows.length})</h3>
      <table className="w-full text-xs text-gray-300">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left pb-2">External ID</th>
            <th className="text-left pb-2">Name</th>
            <th className="text-left pb-2">Type</th>
            <th className="text-left pb-2">Market</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.externalId} className="border-b border-gray-800/50">
              <td className="py-1.5 pr-4 font-mono">{r.externalId}</td>
              <td className="py-1.5 pr-4">{r.name}</td>
              <td className="py-1.5 pr-4">{r.type}</td>
              <td className="py-1.5">{r.market}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
