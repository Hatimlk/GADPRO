import { X, ChevronDown } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";

const MOROCCAN_BANKS = [
  "Attijariwafa Bank",
  "Banque Populaire",
  "Bank of Africa",
  "CIH Bank",
  "Crédit Agricole du Maroc",
  "Société Générale",
  "BMCI",
  "Crédit du Maroc",
  "Al Barid Bank",
  "CFG Bank",
  "CDG"
];
import { useApp } from "@/lib/AppContext";
import type { BankAccount } from "@/lib/types";

interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAccount?: BankAccount | null;
}

export function NewAccountModal({ isOpen, onClose, editAccount }: NewAccountModalProps) {
  const { addBankAccount, updateBankAccount } = useApp();
  const [bankName, setBankName] = useState("");
  const [agence, setAgence] = useState("");
  const [numCompte, setNumCompte] = useState("");

  useEffect(() => {
    if (editAccount) {
      setBankName(editAccount.bankName);
      if (editAccount.rib.includes('/')) {
        const parts = editAccount.rib.split('/');
        setAgence(parts[0].trim());
        setNumCompte(parts.slice(1).join('/').trim());
      } else {
        setAgence("");
        setNumCompte(editAccount.rib);
      }
    } else {
      setBankName("");
      setAgence("");
      setNumCompte("");
    }
  }, [editAccount, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!editAccount;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ribValue = agence ? `${agence} / ${numCompte}` : numCompte;
    if (isEditing) {
      updateBankAccount(editAccount.id, { bankName, rib: ribValue });
    } else {
      addBankAccount({ bankName, rib: ribValue });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900 m-0">
            {isEditing ? "Modifier le compte bancaire" : "Nouveau Compte Bancaire"}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-[6px] hover:bg-slate-50 border-none bg-transparent cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <div className="relative">
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={`w-full px-4 py-3.5 border border-slate-200 rounded-[8px] text-[13px] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer ${!bankName ? 'text-slate-400' : 'text-slate-700'}`}
                  required
                >
                  <option value="" disabled hidden>Sélectionner une Banque</option>
                  {MOROCCAN_BANKS.map((bank) => (
                    <option key={bank} value={bank} className="text-slate-700 font-medium">
                      {bank}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div>
              <input
                type="text"
                value={agence}
                onChange={(e) => setAgence(e.target.value)}
                placeholder="Agence (ex: 48 Bd Mohamed V, Casablanca)"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400"
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={numCompte}
                onChange={(e) => setNumCompte(e.target.value)}
                placeholder="Num de Compte (ex: 021 010000171030001101 84)"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono placeholder:text-slate-400 placeholder:font-sans"
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-[6px] hover:bg-slate-50 transition cursor-pointer">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 text-[13px] font-semibold text-white bg-primary rounded-[6px] hover:opacity-90 transition border-none cursor-pointer">
                {isEditing ? "Enregistrer" : "Créer le compte"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
