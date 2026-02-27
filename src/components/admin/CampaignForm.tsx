"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CampaignFormProps {
  initialData?: {
    id?: string;
    name: string;
    description?: string | null;
    targetPoiTypes: string[];
    requiredPosts: number;
    creditReward: string;
    currency: string;
    startDate: string;
    endDate: string;
    maxParticipants?: number | null;
    maxTotalCredits?: string | null;
    frequency: string;
    autoPublish: boolean;
  };
}

const POI_TYPES = ["ACC", "TTD", "FNB"];
const FREQUENCIES = ["ONE_TIME", "WEEKLY", "MONTHLY"];
const CURRENCIES = ["IDR", "USD"];

export default function CampaignForm({ initialData }: CampaignFormProps) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [targetPoiTypes, setTargetPoiTypes] = useState<string[]>(initialData?.targetPoiTypes ?? []);
  const [requiredPosts, setRequiredPosts] = useState(initialData?.requiredPosts?.toString() ?? "1");
  const [creditReward, setCreditReward] = useState(initialData?.creditReward ?? "");
  const [currency, setCurrency] = useState(initialData?.currency ?? "IDR");
  const [startDate, setStartDate] = useState(initialData?.startDate?.slice(0, 16) ?? "");
  const [endDate, setEndDate] = useState(initialData?.endDate?.slice(0, 16) ?? "");
  const [maxParticipants, setMaxParticipants] = useState(initialData?.maxParticipants?.toString() ?? "");
  const [maxTotalCredits, setMaxTotalCredits] = useState(initialData?.maxTotalCredits ?? "");
  const [frequency, setFrequency] = useState(initialData?.frequency ?? "ONE_TIME");
  const [autoPublish, setAutoPublish] = useState(initialData?.autoPublish ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function togglePoiType(t: string) {
    setTargetPoiTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      name,
      description: description || undefined,
      targetPoiTypes,
      requiredPosts: parseInt(requiredPosts),
      creditReward: parseFloat(creditReward),
      currency,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      maxTotalCredits: maxTotalCredits ? parseFloat(maxTotalCredits) : undefined,
      frequency,
      autoPublish,
    };

    const url = isEdit ? `/api/admin/campaigns/${initialData.id}` : "/api/admin/campaigns";
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

    router.push("/admin/campaigns");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {errors._form && (
        <div className="p-3 bg-red-950 border border-red-800 rounded text-sm text-red-400">{errors._form}</div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Name <span className="text-red-400">*</span></label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500 resize-y"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Target POI Types <span className="text-red-400">*</span></label>
        <div className="flex gap-3">
          {POI_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={targetPoiTypes.includes(t)}
                onChange={() => togglePoiType(t)}
                className="rounded border-gray-600"
              />
              {t}
            </label>
          ))}
        </div>
        {errors.targetPoiTypes && <p className="text-xs text-red-400">{errors.targetPoiTypes}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Required Posts <span className="text-red-400">*</span></label>
          <input
            type="number"
            min="1"
            value={requiredPosts}
            onChange={(e) => setRequiredPosts(e.target.value)}
            required
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Credit Reward <span className="text-red-400">*</span></label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={creditReward}
            onChange={(e) => setCreditReward(e.target.value)}
            required
            placeholder="e.g. 50000"
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Start Date <span className="text-red-400">*</span></label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">End Date <span className="text-red-400">*</span></label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
          {errors.endDate && <p className="text-xs text-red-400">{errors.endDate}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Max Participants</label>
          <input
            type="number"
            min="1"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Unlimited"
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Budget Cap (max total credits)</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={maxTotalCredits}
            onChange={(e) => setMaxTotalCredits(e.target.value)}
            placeholder="No cap"
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-500"
          >
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
          </select>
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              className="rounded border-gray-600"
            />
            Auto-publish when start date arrives
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Campaign"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/campaigns")}
          className="px-4 py-2 text-gray-400 hover:text-white text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
