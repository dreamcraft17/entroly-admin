import { prisma } from "@/lib/prisma";
import ScriptForm from "@/components/admin/ScriptForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const script = await prisma.scriptLibrary.findUnique({ where: { id } });
  if (!script) notFound();

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/scripts" className="text-sm text-gray-500 hover:text-gray-300">
          ← Script Library
        </Link>
        <h1 className="text-xl font-semibold text-white mt-2">Edit Script</h1>
      </div>
      <ScriptForm
        initialData={{
          id: script.id,
          text: script.text,
          poiType: script.poiType,
          language: script.language,
          market: script.market,
        }}
      />
    </div>
  );
}
