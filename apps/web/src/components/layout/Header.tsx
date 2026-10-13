import { Bell, Search, X } from "lucide-react";
import { COMPANY_NAME, useApp } from "@/lib/AppContext";
import { useState, type FormEvent, useMemo, useRef, useEffect } from "react";
import { differenceInDays, parseISO, addDays } from "date-fns";
import type { Notification } from "@/lib/types";
import { formatMAD } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { checks, instances, deleteCheck, deleteInstance } = useApp();

  const notifications = useMemo<Notification[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStatuses = ["En Circulation", "En Retard"];

    const checkNotifs: Notification[] = checks
      .filter((c) => activeStatuses.includes(c.status))
      .filter((c) => {
        const due = parseISO(c.dueDate);
        due.setHours(0, 0, 0, 0);
        const days = differenceInDays(due, today);
        return days <= 7;
      })
      .map((c) => {
        const due = parseISO(c.dueDate);
        due.setHours(0, 0, 0, 0);
        const days = differenceInDays(due, today);
        return {
          id: `check-${c.id}`,
          type: days < 0 ? "overdue" as const : "due_soon" as const,
          checkId: c.id,
          dueDate: c.dueDate,
          amount: c.amount,
          partnerName: c.partnerName,
          facture: c.facture,
          source: "check" as const,
        };
      });

    const instanceNotifs: Notification[] = instances
      .filter((i) => !i.paymentDate)
      .map((i) => {
        const daysDelay = parseInt(i.paymentDelay) || 0;
        const due = new Date(i.date);
        due.setDate(due.getDate() + daysDelay);
        due.setHours(0, 0, 0, 0);
        return { instance: i, due };
      })
      .filter(({ due }) => differenceInDays(due, today) <= 7)
      .map(({ instance, due }) => {
        const days = differenceInDays(due, today);
        return {
          id: `inst-${instance.id}`,
          type: days < 0 ? "overdue" as const : "due_soon" as const,
          checkId: String(instance.id),
          dueDate: due.toISOString().split('T')[0],
          amount: instance.amount,
          partnerName: instance.partnerName,
          facture: instance.facture,
          source: "instance" as const,
        };
      });

    return [...checkNotifs, ...instanceNotifs].sort((a, b) => {
      const da = new Date(a.dueDate).getTime();
      const db = new Date(b.dueDate).getTime();
      return da - db;
    });
  }, [checks, instances]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    navigate(`/cheques/regles?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const overdue = notifications.filter((n) => n.type === "overdue");
  const dueSoon = notifications.filter((n) => n.type === "due_soon");
  const totalCount = notifications.length;

  return (
    <header className="h-[60px] border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <form onSubmit={handleSearch} className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher (RIB, N°, Partenaire)..."
            className="w-full pl-9 pr-4 py-[6px] bg-slate-50 border border-slate-200 rounded-[6px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>
      </div>

      <div className="flex items-center gap-5">
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
          >
            <Bell className="w-[18px] h-[18px]" />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-lg border border-slate-200 z-50 max-h-[70vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                      Aucune notification
                    </div>
                  ) : (
                    <>
                      {overdue.length > 0 && (
                        <div className="px-4 py-2 bg-red-50/50">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                            En retard ({overdue.length})
                          </p>
                        </div>
                      )}
                      {overdue.map((n) => (
                        <NotificationItem key={n.id} notification={n} onDelete={() => {
                          if (n.source === "check" && n.checkId) deleteCheck(n.checkId);
                          else if (n.source === "instance" && n.checkId) deleteInstance(Number(n.checkId));
                        }} />
                      ))}

                      {dueSoon.length > 0 && (
                        <div className="px-4 py-2 bg-amber-50/50">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                            Échéance dans 7 jours ({dueSoon.length})
                          </p>
                        </div>
                      )}
                      {dueSoon.map((n) => (
                        <NotificationItem key={n.id} notification={n} onDelete={() => {
                          if (n.source === "check" && n.checkId) deleteCheck(n.checkId);
                          else if (n.source === "instance" && n.checkId) deleteInstance(Number(n.checkId));
                        }} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 pl-5 border-l border-slate-200 text-[13px] font-semibold bg-slate-50 py-1.5 px-3 rounded-[6px]">
          <div className="w-[24px] h-[24px] rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px]">
            G
          </div>
          <span className="text-slate-700">{COMPANY_NAME}</span>
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ notification, onDelete }: { notification: Notification; onDelete?: () => void }) {
  const due = parseISO(notification.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = differenceInDays(due, today);

  const isOverdue = notification.type === "overdue";

  return (
    <div className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
            isOverdue ? "bg-red-500" : "bg-amber-500"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-slate-800 truncate">
            {notification.partnerName}
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {formatMAD(notification.amount)}
            {notification.source === "instance" ? (
              <span className="ml-1 text-amber-600 font-medium">· Instance</span>
            ) : notification.source === "check" ? (
              <span className="ml-1 text-blue-600 font-medium">· Chèque</span>
            ) : null}
            {notification.facture && (
              <span className="ml-1 text-slate-400">· {notification.facture}</span>
            )}
          </p>
          <p
            className={`text-[11px] mt-1 font-medium ${
              isOverdue ? "text-red-600" : "text-amber-600"
            }`}
          >
            {isOverdue
              ? `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? "s" : ""}`
              : days === 0
              ? "À payer aujourd'hui"
              : days === 1
              ? "À payer dans 1 jour"
              : `À payer dans ${days} jours`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-2">
          {onDelete && (
             <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 border-none cursor-pointer bg-transparent" title="Supprimer définitivement">
                <Trash2 className="w-4 h-4" />
             </button>
          )}
        </div>
      </div>
    </div>
  );
}
