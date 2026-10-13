import { X, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Check } from "@/lib/types";
import { formatMAD, cn, getBankLogo } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";
import { useNavigate } from "react-router-dom";

interface ViewCheckModalProps {
  check: Check | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  "En Circulation": "bg-orange-50 text-orange-600",
  "En Retard":      "bg-red-50 text-red-600",
  "Déposé":         "bg-blue-50 text-blue-600",
  "Impayé":         "bg-orange-100 text-orange-700",
  "Payé":           "bg-green-50 text-green-600",
  "Annulé":         "bg-slate-100 text-slate-600",
};

export function ViewCheckModal({ check, onClose }: ViewCheckModalProps) {
  const { bankAccounts, checkbooks } = useApp();
  const navigate = useNavigate();

  if (!check) return null;

  const account = bankAccounts.find(a => a.id === check.bankAccountId);
  const checkbook = checkbooks.find(cb => cb.id === check.checkbookId);
  const logoPath = account ? getBankLogo(account.bankName) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(check.dueDate + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysLabel = diff === 0 ? "Aujourd'hui" : diff < 0 ? `${Math.abs(diff)}j retard` : `dans ${diff}j`;
  const daysColor = diff < 0 ? "bg-red-50 text-red-600" : diff === 0 ? "bg-orange-50 text-orange-600" : "bg-primary/10 text-primary";

  const handlePrint = () => {
    navigate("/impression", {
      state: {
        bankType: account ? `${account.bankName} - ${check.type}` : undefined,
        amount: String(check.amount),
        payee: check.partnerName,
        date: check.emissionDate,
        dueDate: check.dueDate,
        checkNumber: check.number,
        type: check.type,
      }
    });
    onClose();
  };

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[12px] text-slate-400 font-medium">{label}</span>
      <div className="text-[12px] font-semibold text-slate-800">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={cn("px-2 py-0.5 rounded-[4px] text-[11px] font-bold text-white", check.type === 'Effet' ? 'bg-[#FF9800]' : 'bg-[#1E293B]')}>
              {check.type}
            </span>
            <span className="font-bold text-slate-900 text-[15px]">N° {check.number}</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-[6px] hover:bg-slate-50 border-none bg-transparent cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-slate-50 rounded-[10px] p-4 text-center mb-4">
            <div className="text-[11px] text-slate-400 mb-1">Montant</div>
            <div className="text-[26px] font-extrabold text-slate-900">{formatMAD(check.amount)}</div>
          </div>

          <Row label="Statut">
            <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold", STATUS_STYLES[check.status])}>
              {check.status}
            </span>
          </Row>
          <Row label="Fournisseur / Bénéficiaire">{check.partnerName}</Row>
          <Row label="Banque">
            <div className="flex items-center gap-1.5">
              {logoPath && <img src={logoPath} alt="" className="w-4 h-4 rounded-full object-cover" />}
              {account?.bankName || "—"}
            </div>
          </Row>
          {checkbook && (
            <Row label="Carnet">N°{checkbook.startNumber}–{checkbook.endNumber}</Row>
          )}
          <Row label="Date d'émission">{check.emissionDate}</Row>
          <Row label="Date d'échéance">
            <div className="flex items-center gap-2">
              {check.dueDate}
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", daysColor)}>{daysLabel}</span>
            </div>
          </Row>
          {check.note && (
            <div className="mt-3 bg-amber-50 rounded-[8px] p-3 text-[12px] text-amber-800">
              <span className="font-semibold">Note : </span>{check.note}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-[6px] hover:bg-slate-50 transition cursor-pointer">
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-semibold text-white bg-slate-900 rounded-[6px] hover:bg-slate-800 transition border-none cursor-pointer">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
