"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { BreadcrumbProvider, useBreadcrumb } from "@/contexts/breadcrumb";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { getNavItemsForRole } from "@/config/nav.config";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Bell,
  Search,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Role } from "@prisma/client";

const ROUTE_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  pengaturan:   "Pengaturan",
  pengguna:     "Pengguna",
  klinik:       "Klinik",
  masterdata:   "Data Klinis",
  "data-dokter": "Data Dokter",
  poli:         "Poliklinik",
  tindakan:     "Tindakan",
  penunjang:    "Penunjang",
  peralatan:    "Peralatan",
  laboratorium: "Laboratorium",
  radiologi:    "Radiologi",
  pasien:       "Pasien",
  pendaftaran:  "Pendaftaran Pasien",
  pemeriksaan:  "Pemeriksaan",
  "rawat-inap": "Rawat Inap",
  farmasi:      "Farmasi",
  resep:        "Resep",
  "stok-obat":  "Stok Obat",
  billing:      "Billing",
  laporan:      "Laporan",
};

const ID_PATTERN = /^[a-z0-9]{20,}$/i;

function Breadcrumb() {
  const pathname   = usePathname();
  const { segments } = useBreadcrumb();

  const parts = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  let accumulated = "";
  for (const part of parts) {
    accumulated += `/${part}`;
    if (part === "dashboard") continue;

    if (ID_PATTERN.test(part) && segments.length > 0) {
      const last = segments[segments.length - 1];
      crumbs.push({ label: last.label, href: last.href ?? accumulated });
      break;
    }

    const label = ROUTE_LABELS[part] ?? part.replace(/-/g, " ");
    crumbs.push({ label, href: accumulated });
  }

  if (crumbs.length <= 1) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/50">/</span>}
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium capitalize">{crumb.label}</span>
          ) : (
            <a href={crumb.href} className="hover:text-foreground transition-colors capitalize">
              {crumb.label}
            </a>
          )}
        </span>
      ))}
    </div>
  );
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  DOKTER: "Dokter",
  PERAWAT: "Perawat",
  APOTEKER: "Apoteker",
  KASIR: "Kasir",
  REKAM_MEDIS: "Rekam Medis",
  PASIEN: "Pasien",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = (session?.user?.role as Role) || "ADMISSION";
  const navItems = getNavItemsForRole(userRole);
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-3"} p-4 border-b border-sidebar-border`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-primary shadow-md flex-shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-sm text-sidebar-foreground">EMR System</h1>
            <p className="text-[10px] text-sidebar-foreground/50">Rekam Medis Elektronik</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.title);
          const Icon = item.icon;

          return (
            <div key={item.title}>
              {collapsed && !isMobile ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        href={hasChildren ? "#" : item.href}
                        onClick={hasChildren ? () => toggleExpanded(item.title) : undefined}
                        className={`flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200 ${
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-blue-500/20"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    }
                  />
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Link
                    href={hasChildren ? "#" : item.href}
                    onClick={(e) => {
                      if (hasChildren) {
                        e.preventDefault();
                        toggleExpanded(item.title);
                      }
                      if (isMobile && !hasChildren) setMobileOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-blue-500/20"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`} />
                    <span className="flex-1">{item.title}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    )}
                  </Link>

                  {/* Children */}
                  {hasChildren && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 animate-slide-in">
                      {item.children!.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.title}
                            href={child.href}
                            onClick={() => isMobile && setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              childActive
                                ? "bg-sidebar-primary/80 text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${childActive ? "bg-white" : "bg-sidebar-foreground/30"}`} />
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-3"} w-full p-2 rounded-lg hover:bg-sidebar-accent transition-all duration-200`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {(!collapsed || isMobile) && (
              <div className="flex-1 text-left animate-fade-in">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{userName}</p>
                <p className="text-[10px] text-sidebar-foreground/50">{roleLabels[userRole] || userRole}</p>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tombol Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-3"} w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all duration-200`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <BreadcrumbProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col gradient-sidebar transition-all duration-300 ease-in-out ${
          collapsed ? "w-[70px]" : "w-[260px]"
        }`}
      >
        <SidebarContent />
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-6 -right-3 z-50 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
          style={{ left: collapsed ? "57px" : "247px" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 gradient-sidebar border-r-0">
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          {/* Left: Mobile Menu + Breadcrumb */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Breadcrumb />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            <ThemeToggle />
            <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground">{roleLabels[userRole] || userRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
    </BreadcrumbProvider>
  );
}
