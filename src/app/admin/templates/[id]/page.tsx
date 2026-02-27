import { prisma } from "@/lib/prisma";
import TemplateForm from "@/components/admin/TemplateForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/templates" className="text-sm text-gray-500 hover:text-gray-300">
          ← Templates
        </Link>
        <h1 className="text-xl font-semibold text-white mt-2">Edit Template</h1>
      </div>
      <TemplateForm
        initialData={{
          id: template.id,
          name: template.name,
          category: template.category,
          seedanceConfigJson: template.seedanceConfigJson as object,
          fallbackVendorConfigJson: template.fallbackVendorConfigJson as object | null,
          sampleThumbnailUrl: template.sampleThumbnailUrl,
          performanceTags: template.performanceTags,
          performanceScore: template.performanceScore,
        }}
      />
    </div>
  );
}
