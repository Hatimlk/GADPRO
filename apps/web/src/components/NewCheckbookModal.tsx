import { useState, type FormEvent } from "react";
import { useApp, COMPANY_NAME } from "@/lib/AppContext";
import type { CheckType } from "@/lib/types";

interface NewCheckbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCheckbookModal({ isOpen, onClose }: NewCheckbookModalProps) {
  const { addCheckbook, bankAccounts } = useApp();
  const [bankAccountId, setBankAccountId] = useState("");
  const [type, setType] = useState<CheckType>("Chèque");
  const [startNumber, setStartNumber] = useState("");
  const [size, setSize] = useState("10");
  const [company, setCompany] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const account = bankAccounts.find(a => a.id === bankAccountId);
    if (!account) return;
    
    const start = parseInt(startNumber);
    const s = parseInt(size);
    const endNumber = (!isNaN(start) && !isNaN(s)) ? (start + s - 1).toString() : "";

    addCheckbook({ bankAccountId, bankName: account.bankName, type, startNumber, endNumber });
    
    setBankAccountId("");
    setStartNumber("");
    setSize("10");
    setCompany("");
    onClose();
  };

  const isFormValid = bankAccountId && startNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[16px] shadow-xl w-full max-w-[700px] overflow-hidden flex flex-col p-8 relative">
        <h2 className="text-[20px] font-bold text-[#1E293B] mb-8 mt-2">Ajouter un Carnet</h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Type Selector */}
          <div className="flex items-center gap-6 mb-8">
            <label className="text-[14px] font-medium text-[#475569] w-[160px] shrink-0">
              Sélectionner un Type
            </label>
            <div className="flex bg-[#F1F5F9] p-1.5 rounded-[8px] flex-1">
              <button
                type="button"
                onClick={() => setType("Chèque")}
                className={`flex-1 py-2.5 text-[14px] font-bold rounded-[6px] transition-all cursor-pointer border-none ${type === "Chèque" ? "bg-white text-[#1E293B] shadow-sm" : "bg-transparent text-[#64748B] hover:text-[#475569]"}`}
              >
                Chèque
              </button>
              <button
                type="button"
                onClick={() => setType("Effet")}
                className={`flex-1 py-2.5 text-[14px] font-bold rounded-[6px] transition-all cursor-pointer border-none ${type === "Effet" ? "bg-white text-[#1E293B] shadow-sm" : "bg-transparent text-[#64748B] hover:text-[#475569]"}`}
              >
                Effet
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
            {/* Société Dropdown */}
            <div className="relative">
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-[8px] text-[13px] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${!company ? 'text-[#94A3B8]' : 'text-[#475569]'}`}
              >
                <option value="" disabled hidden>Sélectionner une Société</option>
                <option value={COMPANY_NAME}>{COMPANY_NAME}</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            {/* RIB Dropdown */}
            <div className="relative">
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className={`w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-[8px] text-[13px] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${!bankAccountId ? 'text-[#94A3B8]' : 'text-[#475569]'}`}
                required
              >
                <option value="" disabled hidden>Sélectionner un RIB</option>
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.bankName} - {a.rib}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            {/* Premier numéro Input */}
            <div className="relative">
              <input
                type="text"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                placeholder="Premier numéro"
                className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-[8px] text-[13px] font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-[#94A3B8]"
                required
              />
            </div>

            {/* Taille Dropdown */}
            <div className="relative">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-[8px] text-[13px] text-[#1E293B] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <div className="absolute top-0 left-3 -mt-[9px] px-1 bg-white text-[11px] text-[#64748B] font-semibold">Sélectionner la Taille</div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-12 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-[14px] font-bold text-[#1E293B] bg-white border border-[#E2E8F0] rounded-[8px] hover:bg-slate-50 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={`px-6 py-2.5 text-[14px] font-bold rounded-[8px] transition border-none cursor-pointer ${isFormValid ? 'bg-primary text-white hover:opacity-90' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}
            >
              Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
