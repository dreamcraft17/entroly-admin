"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ScriptFormProps {
  initialData?: {
    id?: string;
    text: string;
    poiType: string;
    language: string;
    market: string;
  };
}

const POI_TYPES = ["ACC", "TTD", "FNB"];
const LANGUAGES = ["id", "en", "zh"];
const MARKETS = ["IDN", "US", "SGP"];

export default function ScriptForm({ initialData }: ScriptFormProps) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [text, setText] = useState(initialData?.text ?? "");
  const [poiType, setPoiType] = useState(initialData?.poiType ?? "");
  const [language, setLanguage] = useState(initialData?.language ?? "");
  const [market, setMarket] = useState(initialData?.market ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const charsLeft = 500 - text.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const url = isEdit
      ? `/api/admin/scripts/${initialData.id}`
      : "/api/admin/scripts";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, poiType, language, market }),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.details?.fieldErrors) setErrors(json.details.fieldErrors);
      else setErrors({ _form: json.error ?? "Something went wrong" });
      setSubmitting(false);
      return;
    }

    router.push("/admin/scripts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {errors._form && (
        <div className="p-3 bg-red-950 border border-red-800 rounded text-sm text-red-400">
          {errors._form}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            Script Text <span className="text-red-400">*</span>
          </label>
          <span className={`text-xs ${charsLeft < 50 ? "text-red-400" : "text-gray-500"}`}>
            {charsLeft} chars left
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={500}
          required
          className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500 resize-y"
          placeholder="Write the TikTok GO script here..."
        />
        {errors.text && <p className="text-xs text-red-400">{errors.text}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            POI Type <span className="text-red-400">*</span>
          </label>
          <select
            value={poiType}
            onChange={(e) => setPoiType(e.target.value)}
            required
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          >
            <option value="">Select...</option>
            {POI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Language <span className="text-red-400">*</span>
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            required
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          >
            <option value="">Select...</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Market <span className="text-red-400">*</span>
          </label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            required
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          >
            <option value="">Select...</option>
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Script"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/scripts")}
          className="px-4 py-2 text-gray-400 hover:text-white text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
