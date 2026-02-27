"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import JsonEditor from "./JsonEditor";

interface TemplateFormProps {
  initialData?: {
    id?: string;
    name: string;
    category: string;
    seedanceConfigJson: object;
    fallbackVendorConfigJson?: object | null;
    sampleThumbnailUrl?: string | null;
    performanceTags: string[];
    performanceScore?: number | null;
  };
}

const CATEGORIES = ["ACC", "TTD", "FNB", "GENERAL"];

const DEFAULT_SEEDANCE_CONFIG = {
  variation_params: {
    style_variation: ["cinematic", "vibrant"],
    motion_speed: "medium",
  },
  style: "tiktok_go",
  duration_sec: 15,
  aspect_ratio: "9:16",
  resolution: "1080p",
  motion_level: "medium",
};

export default function TemplateForm({ initialData }: TemplateFormProps) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [seedanceConfig, setSeedanceConfig] = useState<object>(
    initialData?.seedanceConfigJson ?? DEFAULT_SEEDANCE_CONFIG
  );
  const [fallbackConfig, setFallbackConfig] = useState<object | null>(
    initialData?.fallbackVendorConfigJson ?? null
  );
  const [showFallback, setShowFallback] = useState(!!initialData?.fallbackVendorConfigJson);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.sampleThumbnailUrl ?? "");
  const [tagsInput, setTagsInput] = useState(initialData?.performanceTags.join(", ") ?? "");
  const [score, setScore] = useState(initialData?.performanceScore?.toString() ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      name,
      category,
      seedanceConfigJson: seedanceConfig,
      fallbackVendorConfigJson: showFallback ? fallbackConfig : null,
      sampleThumbnailUrl: thumbnailUrl || null,
      performanceTags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      performanceScore: score ? parseFloat(score) : null,
    };

    const url = isEdit
      ? `/api/admin/templates/${initialData.id}`
      : "/api/admin/templates";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.details?.fieldErrors) setErrors(json.details.fieldErrors);
      else setErrors({ _form: json.error ?? "Something went wrong" });
      setSubmitting(false);
      return;
    }

    router.push("/admin/templates");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {errors._form && (
        <div className="p-3 bg-red-950 border border-red-800 rounded text-sm text-red-400">
          {errors._form}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
            required
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
            required
          >
            <option value="">Select...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
        </div>
      </div>

      <JsonEditor
        label="Seedance Config JSON"
        required
        value={seedanceConfig}
        onChange={setSeedanceConfig}
        error={errors.seedanceConfigJson}
      />

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showFallback}
            onChange={(e) => setShowFallback(e.target.checked)}
            className="rounded border-gray-600"
          />
          Add Fallback Vendor Config
        </label>
        {showFallback && (
          <JsonEditor
            label="Fallback Vendor Config JSON"
            value={fallbackConfig ?? { vendor: "", endpoint: "", params: {} }}
            onChange={setFallbackConfig}
            error={errors.fallbackVendorConfigJson}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Performance Tags</label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. trending, food, outdoor"
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
          <p className="text-xs text-gray-500">Comma-separated</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Performance Score</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="0–100"
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Sample Thumbnail URL</label>
        <input
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://..."
          className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/templates")}
          className="px-4 py-2 text-gray-400 hover:text-white text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
