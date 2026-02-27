import TemplateForm from "@/components/admin/TemplateForm";
import Link from "next/link";

export default function NewTemplatePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/templates" className="text-sm text-gray-500 hover:text-gray-300">
          ← Templates
        </Link>
        <h1 className="text-xl font-semibold text-white mt-2">New Template</h1>
      </div>
      <TemplateForm />
    </div>
  );
}
