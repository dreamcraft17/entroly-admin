"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/scripts", label: "Script Library" },
  { href: "/admin/pois", label: "POIs" },
  { href: "/admin/campaigns", label: "Campaigns" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-8">
        <span className="font-semibold text-white tracking-tight">ENTROPI Admin</span>
        <nav className="flex gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
