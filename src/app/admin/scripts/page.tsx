"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Script {
  id: string;
  text: string;
  poiType: string;
  language: string;
  market: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterPoiType, setFilterPoiType] = useState("");

  async function load() {
    setLoading(true);
    const qs = filterPoiType ? `?poiType=${filterPoiType}` : "";
    const res = await fetch(`/api/admin/scripts${qs}`);
    const json = await res.json();
    setScripts(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterPoiType]); // eslint-disable-line

  async function handleDelete(id: string) {
    if (!confirm("Delete this script? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/admin/scripts/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Script Library</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/admin/scripts/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          + New Script
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[["", "All"], ["ACC", "ACC"], ["TTD", "TTD"], ["FNB", "FNB"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterPoiType(val)}
            className={`px-3 py-1 text-sm rounded ${
              filterPoiType === val
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Loading...</div>
      ) : scripts.length === 0 ? (
        <div className="text-gray-500 text-sm py-12 text-center">No scripts found.</div>
      ) : (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Script</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">POI Type</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Language</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Market</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Uses</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {scripts.map((s) => (
                <tr key={s.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-gray-200 max-w-xs">
                    <p className="truncate">{s.text}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                      {s.poiType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{s.language}</td>
                  <td className="px-4 py-3 text-gray-300">{s.market}</td>
                  <td className="px-4 py-3 text-gray-400">{s.usageCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/scripts/${s.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50"
                      >
                        {deleting === s.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
