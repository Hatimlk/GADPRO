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

export type PartnerType = "Client" | "Fournisseur";

export interface Partner {
  id: number;
  type: PartnerType;
  name: string;
  contact: string;
  phone: string;
  balance: number;
  convention?: string;
}

interface NewPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partner: Omit<Partner, "id">) => void;
  editPartner?: Partner | null;
}

export function NewPartnerModal({ isOpen, onClose, onSave, editPartner }: NewPartnerModalProps) {
  const [type, setType] = useState<PartnerType>("Client");
  const [name, setName] = useState("");
  const [banque, setBanque] = useState("");
  const [agence, setAgence] = useState("");
  const [numCompte, setNumCompte] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [convention, setConvention] = useState<string>("120 Jours");

  useEffect(() => {
    if (editPartner) {
      setType(editPartner.type);
      setName(editPartner.name);
      if (editPartner.contact && editPartner.contact.includes(' / ')) {
        const parts = editPartner.contact.split(' / ');
        setBanque(parts[0]);
        setAgence(parts.slice(1).join(' / '));
      } else {
        setBanque(editPartner.contact || "");
        setAgence("");
      }
      setNumCompte(editPartner.phone || "");
      setBalance(editPartner.balance);
      setConvention(editPartner.convention || "120 Jours");
    } else {
      setType("Client");
      setName("");
      setBanque("");
      setAgence("");
      setNumCompte("");
      setBalance(0);
      setConvention("120 Jours");
    }
  }, [editPartner, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const contact = agence ? `${banque} / ${agence}` : banque;
    const phone = numCompte;
    onSave({ type, name, contact, phone, balance, convention });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900 m-0">{editPartner ? "Modifier Partenaire" : "Nouveau Partenaire"}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-[6px] hover:bg-slate-50 border-none bg-transparent cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Hidden field to keep default type state */}
            <input type="hidden" value={type} />
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">Raison Sociale / Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Entreprise Z"
                className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">Banque</label>
                <div className="relative">
                  <select
                    value={banque}
                    onChange={(e) => setBanque(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer ${!banque ? 'text-slate-400' : 'text-slate-700'}`}
                  >
                    <option value="" disabled hidden>Ex: Crédit du Maroc</option>
                    {MOROCCAN_BANKS.map((bank) => (
                      <option key={bank} value={bank} className="text-slate-700">
                        {bank}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">Agence</label>
                <input
                  type="text"
                  value={agence}
                  onChange={(e) => setAgence(e.target.value)}
                  placeholder="Ex: 48 Bd Mohamed V..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">Num de Compte</label>
                <input
                  type="text"
                  value={numCompte}
                  onChange={(e) => setNumCompte(e.target.value)}
                  placeholder="Ex: 021 010..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">Convention</label>
                <input
                  list="partner-convention-options"
                  type="text"
                  value={convention}
                  onChange={(e) => setConvention(e.target.value)}
                  placeholder="Ex: 120 Jours"
                  className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <datalist id="partner-convention-options">
                  <option value="30 Jours" />
                  <option value="60 Jours" />
                  <option value="90 Jours" />
                  <option value="120 Jours" />
                </datalist>
              </div>
            </div>


            {/* Footer */}
            <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-[6px] hover:bg-slate-50 transition cursor-pointer">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 text-[13px] font-semibold text-white bg-primary rounded-[6px] hover:opacity-90 transition border-none cursor-pointer">
                {editPartner ? "Sauvegarder" : "Ajouter le partenaire"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
