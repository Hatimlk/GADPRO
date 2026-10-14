import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AppTour } from "../AppTour";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      <AppTour />
      <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans overflow-hidden text-slate-800 text-[13px]">
      {sidebarOpen && <button aria-label="Fermer le menu" className="fixed inset-0 z-40 bg-slate-950/60 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <Sidebar onNavigate={() => setSidebarOpen(false)} className={`fixed inset-y-0 left-0 z-50 shrink-0 transition-transform md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="hidden md:block"><Header /></div>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden"><button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-700" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button><Link to="/dashboard" className="font-black tracking-wide text-blue-700">PROGAD</Link><span className="w-9" /></div>
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
      </div>
    </>
  );
}
