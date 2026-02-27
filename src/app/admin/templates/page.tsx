"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  performanceScore: number | null;
  performanceTags: string[];
  archivedAt: string | null;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<string>("true");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/templates?isActive=${filterActive}`);
    const json = await res.json();
    setTemplates(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterActive]); // eslint-disable-line

  async function handleArchive(id: string) {
    if (!confirm("Archive this template?")) return;
    setArchiving(id);
    await fetch(`/api/admin/templates/${id}/archive`, { method: "PATCH" });
    setArchiving(null);
    load();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/admin/templates/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          + New Template
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[["true", "Active"], ["false", "Archived"], ["", "All"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterActive(val)}
            className={`px-3 py-1 text-sm rounded ${
              filterActive === val
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
      ) : templates.length === 0 ? (
        <div className="text-gray-500 text-sm py-12 text-center">No templates found.</div>
      ) : (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Tags</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Score</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-300">{t.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.performanceTags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{t.performanceScore ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      t.isActive ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"
                    }`}>
                      {t.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/templates/${t.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Edit
                      </Link>
                      {t.isActive && (
                        <button
                          onClick={() => handleArchive(t.id)}
                          disabled={archiving === t.id}
                          className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50"
                        >
                          {archiving === t.id ? "..." : "Archive"}
                        </button>
                      )}
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
