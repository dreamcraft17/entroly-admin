import CampaignForm from "@/components/admin/CampaignForm";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-white">New Campaign</h1>
      <CampaignForm />
    </div>
  );
}
