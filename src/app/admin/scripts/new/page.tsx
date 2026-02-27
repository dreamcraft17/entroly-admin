import ScriptForm from "@/components/admin/ScriptForm";
import Link from "next/link";

export default function NewScriptPage() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/scripts" className="text-sm text-gray-500 hover:text-gray-300">
          ← Script Library
        </Link>
        <h1 className="text-xl font-semibold text-white mt-2">New Script</h1>
      </div>
      <ScriptForm />
    </div>
  );
}
