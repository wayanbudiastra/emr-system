"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Stethoscope, FlaskConical, RadioTower, Cpu } from "lucide-react";

const tabs = [
  { label: "Poliklinik",   href: "/pengaturan/masterdata/poli",          icon: Building2 },
  { label: "Tindakan",     href: "/pengaturan/masterdata/tindakan",       icon: Stethoscope },
  { label: "Laboratorium", href: "/pengaturan/masterdata/laboratorium",   icon: FlaskConical },
  { label: "Radiologi",    href: "/pengaturan/masterdata/radiologi",      icon: RadioTower },
  { label: "Peralatan",    href: "/pengaturan/masterdata/peralatan",      icon: Cpu },
];

export default function MasterdataLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Data Klinis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola data referensi: poli, tindakan, laboratorium, radiologi, dan peralatan medis
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
