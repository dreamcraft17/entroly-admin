"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CampaignForm from "@/components/admin/CampaignForm";

const STATUS_ACTIONS: Record<string, { action: string; label: string; color: string }[]> = {
  DRAFT:  [{ action: "publish", label: "Publish", color: "bg-green-700 hover:bg-green-600" }],
  ACTIVE: [
    { action: "pause", label: "Pause",  color: "bg-yellow-700 hover:bg-yellow-600" },
    { action: "close", label: "Close",  color: "bg-red-800 hover:bg-red-700" },
  ],
  PAUSED: [
    { action: "publish", label: "Resume", color: "bg-green-700 hover:bg-green-600" },
    { action: "close",   label: "Close",  color: "bg-red-800 hover:bg-red-700" },
  ],
  CLOSED: [],
};

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => { setCampaign(d); setLoading(false); });
  }, [id]);

  async function handleAction(action: string) {
    setActioning(true);
    setError("");
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setActioning(false);
    if (!res.ok) { setError(json.error ?? "Action failed"); return; }
    router.push("/admin/campaigns");
    router.refresh();
  }

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (!campaign) return <div className="text-red-400 text-sm">Campaign not found</div>;

  const status = campaign.status as string;
  const actions = STATUS_ACTIONS[status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Edit Campaign</h1>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-400">{error}</span>}
          {actions.map((a) => (
            <button
              key={a.action}
              onClick={() => handleAction(a.action)}
              disabled={actioning}
              className={`px-3 py-1.5 ${a.color} disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <CampaignForm
        initialData={{
          id: campaign.id as string,
          name: campaign.name as string,
          description: campaign.description as string | null,
          targetPoiTypes: campaign.targetPoiTypes as string[],
          requiredPosts: campaign.requiredPosts as number,
          creditReward: String(campaign.creditReward),
          currency: campaign.currency as string,
          startDate: campaign.startDate as string,
          endDate: campaign.endDate as string,
          maxParticipants: campaign.maxParticipants as number | null,
          maxTotalCredits: campaign.maxTotalCredits ? String(campaign.maxTotalCredits) : null,
          frequency: campaign.frequency as string,
          autoPublish: campaign.autoPublish as boolean,
        }}
      />
    </div>
  );
}
