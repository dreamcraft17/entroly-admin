import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  ACTIVE: "bg-green-900 text-green-300",
  PAUSED: "bg-yellow-900 text-yellow-300",
  CLOSED: "bg-red-900 text-red-300",
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Campaigns</h1>
        <Link
          href="/admin/campaigns/new"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-gray-500">No campaigns yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">POI Types</th>
                <th className="pb-3 pr-4 font-medium">Reward</th>
                <th className="pb-3 pr-4 font-medium">Dates</th>
                <th className="pb-3 pr-4 font-medium">Frequency</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-900/40">
                  <td className="py-3 pr-4 font-medium text-white">{c.name}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1 flex-wrap">
                      {c.targetPoiTypes.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {Number(c.creditReward).toLocaleString()} {c.currency}
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-400">
                    {new Date(c.startDate).toLocaleDateString()} –{" "}
                    {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-xs">{c.frequency.replace("_", " ")}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/campaigns/${c.id}`}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                    >
                      Edit
                    </Link>
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
