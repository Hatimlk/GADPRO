import { Link, useLocation } from "react-router-dom";
import {
  Users,
  Printer,
  CalendarDays,
  LayoutDashboard,
  Briefcase,
  UserCog,
  FileEdit,
  FileUp,
  BookOpen,
  FileCheck,
  Clock,
  LogOut,
  Send,
  Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";

const NAV_GROUPS = [
  {
    title: "TABLEAU DE BORD",
    items: [
      { name: "Tableau de bord", path: "/cheques", icon: LayoutDashboard, requiredModule: "cheques" },
      { name: "Comptes", path: "/cheques/comptes", icon: Briefcase, requiredModule: "cheques" },
      { name: "Rأ´les", path: "/cheques/roles", icon: UserCog, hasInfo: true, requiredModule: "cheques" },
    ]
  },
  {
    title: "CHأˆQUES ET EFFETS",
    items: [
      { name: "Rأ©glأ©s", path: "/cheques/regles", icon: FileCheck, requiredModule: "cheques" },
      { name: "Instances", path: "/cheques/instances", icon: Clock, requiredModule: "cheques" },
      { name: "Calendrier", path: "/cheques/calendrier", icon: CalendarDays, requiredModule: "cheques" },
      { name: "Partenaires", path: "/cheques/partenaires", icon: Users, requiredModule: "cheques" },
      { name: "Ordres de Virement", path: "/cheques/virements", icon: Send, requiredModule: "cheques" },
      { name: "Impression", path: "/cheques/impression", icon: Printer, requiredModule: "cheques" },
      { name: "Consommations", path: "/cheques/consommations", icon: Droplets, requiredModule: "consommations" },
    ]
  },
  {
    title: "AIDE",
    items: [
      { name: "Guide d'utilisation", path: "/cheques/guide", icon: BookOpen, requiredModule: "cheques" }
    ]
  }
];

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const location = useLocation();
  const { currentUser, logout } = useApp();
  const hasCheques = currentUser?.accesses?.some((access) => access.module === 'cheques');
  const hasConsumptions = currentUser?.accesses?.some((access) => access.module === 'consommations');

  return (
    <div className={cn("w-[240px] bg-slate-900 h-[100dvh] flex flex-col text-slate-300", className)}>
      <div className="p-6 flex items-center justify-center">
        <img src="/Logo Gadimat.png" alt="Gadimat Chأ¨ques" className="h-[40px] w-auto object-contain" />
      </div>

      <nav className="flex-1 py-4 overflow-y-auto hide-scrollbar">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className={groupIdx > 0 ? "mt-6" : ""}>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-8">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                if (item.requiredModule === 'cheques' && !hasCheques) return null;
                if (item.requiredModule === 'consommations' && !hasConsumptions) return null;
                if (item.path === "/cheques/roles" && currentUser?.role !== "Administrateur") {
                  return null;
                }
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-tour={item.name}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-[14px] px-4 py-3 mx-4 rounded-[12px] text-[13px] font-bold transition-all duration-200",
                      isActive 
                        ? "bg-[#1e293b] text-blue-500" 
                        : "text-slate-300 hover:text-slate-200 hover:bg-[#1e293b]/50"
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                      {item.hasInfo && (
                        <div className="absolute -top-1.5 -left-2 w-3.5 h-3.5 bg-slate-400 rounded-full flex items-center justify-center text-[#0f172a] text-[9px] font-bold border-2 border-[#0f172a]">
                          i
                        </div>
                      )}
                    </div>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-slate-700 mx-4 my-2" />

        <div className="mx-4 mb-3 grid gap-2">
          <Link to="/dashboard" onClick={onNavigate} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">Accueil GADIMAT</Link>
          {currentUser?.accesses?.some((access) => access.module === 'impayes') && (
            <Link to="/impayes" onClick={onNavigate} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500">Ouvrir le suivi des impayés</Link>
          )}
        </div>

        <div className="px-6 py-2 tour-user-profile flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">{currentUser?.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{currentUser?.email}</div>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#1e293b] rounded-md transition-colors"
            title="Se dأ©connecter"
          >
            <LogOut className="w-[15px] h-[15px]" strokeWidth={2.5} />
          </button>
        </div>

      </nav>
    </div>
  );
}

