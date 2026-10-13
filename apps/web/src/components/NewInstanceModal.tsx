import { useState, useEffect, type FormEvent } from "react";
import { useApp } from "@/lib/AppContext";
import type { Instance } from "@/lib/types";
import { DatePicker } from "./DatePicker";
import { ChevronDown, X } from "lucide-react";

interface NewInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editInstance?: Instance | null;
}

export function NewInstanceModal({ isOpen, onClose, editInstance }: NewInstanceModalProps) {
  const { addInstance, updateInstance, partnerList, instances } = useApp();
  
  const [date, setDate] = useState<Date | null>(null);
  const [facture, setFacture] = useState("");
  const [supplierType, setSupplierType] = useState<"select" | "custom">("select");
  const [partnerId, setPartnerId] = useState("");
  const [customPartnerName, setCustomPartnerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDelay, setPaymentDelay] = useState("120 Jours");
  const [convention, setConvention] = useState("120 Jours");
  const [mdp, setMdp] = useState("Chèque");
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [observation, setObservation] = useState("");

  const suppliers = [...partnerList].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (editInstance) {
      setDate(editInstance.date ? new Date(editInstance.date) : null);
      setFacture(editInstance.facture);
      if (editInstance.partnerId) {
        setSupplierType("select");
        setPartnerId(String(editInstance.partnerId));
        setCustomPartnerName("");
      } else {
        setSupplierType("custom");
        setPartnerId("");
        setCustomPartnerName(editInstance.partnerName);
      }
      setAmount(String(editInstance.amount));
      setPaymentDelay(editInstance.paymentDelay);
      setConvention(editInstance.convention);
      setMdp(editInstance.mdp);
      setPaymentDate(editInstance.paymentDate ? new Date(editInstance.paymentDate) : null);
      setObservation(editInstance.observation || "");
    } else {
      setDate(null);
      setFacture("");
      setSupplierType("select");
      setPartnerId("");
      setCustomPartnerName("");
      setAmount("");
      setPaymentDelay("120 Jours");
      setConvention("120 Jours");
      setMdp("");
      setPaymentDate(null);
      setObservation("");
    }
  }, [editInstance, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!editInstance;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date || amount === "") return;

    if (facture.trim() !== "") {
      const factureExists = instances.some(i => i.facture && i.facture.trim().toLowerCase() === facture.trim().toLowerCase() && (!isEditing || i.id !== editInstance?.id));
      if (factureExists) {
        alert("Ce N° de facture existe déjà.");
        return;
      }
    }
    
    let partnerName = "";
    let pId = "";
    
    if (supplierType === "select") {
      const selected = suppliers.find(s => String(s.id) === partnerId);
      if (selected) {
        partnerName = selected.name;
        pId = String(selected.id);
      } else if (customPartnerName) {
        partnerName = customPartnerName;
      } else {
        alert("Veuillez sélectionner ou saisir un fournisseur.");
        return;
      }
    } else {
      if (!customPartnerName.trim()) {
        alert("Veuillez saisir le nom du fournisseur.");
        return;
      }
      partnerName = customPartnerName.trim();
    }

    const numAmount = parseFloat(amount.replace(/,/g, "."));
    if (isNaN(numAmount)) {
      alert("Montant invalide.");
      return;
    }

    const getLocalDateString = (d: Date | null) => {
      if (!d) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const dateStr = getLocalDateString(date) as string;
    const payDateStr = getLocalDateString(paymentDate);

    const instanceData = {
      date: dateStr,
      facture,
      partnerId: pId || null,
      partnerName,
      amount: numAmount,
      paymentDelay,
      convention,
      mdp,
      paymentDate: payDateStr,
      observation: observation || null
    };

    if (isEditing && editInstance) {
      updateInstance(editInstance.id, instanceData);
    } else {
      addInstance(instanceData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900">
            {isEditing ? "Modifier la Facture en Instance" : "Nouvelle Facture en Instance"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <DatePicker 
                label="Date de la Facture" 
                value={date} 
                onChange={(d) => setDate(d)} 
              />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Facture N°</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] outline-none focus:border-slate-800 focus:border-[1.5px]"
                placeholder="Ex: 26V03005"
                value={facture}
                onChange={e => setFacture(e.target.value)}
              />
            </div>
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Fournisseur / Bénéficiaire</label>
            <button 
              type="button" 
              onClick={() => setSupplierType(supplierType === "select" ? "custom" : "select")}
              className="absolute -top-2.5 right-3 bg-white px-1 text-[10px] text-blue-600 hover:underline font-semibold z-10 cursor-pointer border-none"
            >
              {supplierType === "select" ? "Saisir manuellement" : "Choisir existant"}
            </button>
            {supplierType === "select" ? (
              <div className="relative">
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-700 bg-white appearance-none outline-none focus:border-slate-800 focus:border-[1.5px]"
                  value={partnerId} 
                  onChange={e => {
                    const newId = e.target.value;
                    setPartnerId(newId);
                    const selectedSup = suppliers.find(sup => String(sup.id) === newId);
                    if (selectedSup && selectedSup.convention) {
                      setConvention(selectedSup.convention);
                    }
                  }} 
                  required={suppliers.length > 0}
                >
                  <option value="" disabled>Sélectionner un fournisseur/bénéficiaire</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="" disabled>Aucun fournisseur/bénéficiaire enregistré</option>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] outline-none focus:border-slate-800 focus:border-[1.5px]"
                placeholder="Nom du Fournisseur / Bénéficiaire"
                value={customPartnerName}
                onChange={e => setCustomPartnerName(e.target.value)}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Montant (MAD)</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] outline-none focus:border-slate-800 focus:border-[1.5px]"
                placeholder="Ex: 26000.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Mode de Paiement (MDP)</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-700 bg-white appearance-none outline-none focus:border-slate-800 focus:border-[1.5px]"
                value={mdp} 
                onChange={e => setMdp(e.target.value)} 
              >
                <option value=""></option>
                <option value="Chèque">Chèque</option>
                <option value="Effet">Effet</option>
                <option value="Virement">Virement</option>
                {mdp && mdp !== "Chèque" && mdp !== "Effet" && mdp !== "Virement" && (
                  <option value={mdp}>{mdp}</option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Délai de Paiement</label>
              <input 
                list="payment-delay-options"
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-700 bg-white outline-none focus:border-slate-800 focus:border-[1.5px]"
                placeholder="Ex: 30 Jours"
                value={paymentDelay}
                onChange={e => setPaymentDelay(e.target.value)}
                required
              />
              <datalist id="payment-delay-options">
                <option value="30 Jours" />
                <option value="60 Jours" />
                <option value="90 Jours" />
                <option value="120 Jours" />
              </datalist>
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Convention</label>
              <input 
                list="convention-options"
                className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-700 bg-white outline-none focus:border-slate-800 focus:border-[1.5px]"
                placeholder="Ex: 30 Jours"
                value={convention}
                onChange={e => setConvention(e.target.value)}
                required
              />
              <datalist id="convention-options">
                <option value="30 Jours" />
                <option value="60 Jours" />
                <option value="90 Jours" />
                <option value="120 Jours" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <DatePicker 
                label="Date de Paiement (Optionnel)" 
                value={paymentDate} 
                onChange={(d) => setPaymentDate(d)} 
              />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">Observation</label>
              <textarea 
                className="w-full px-3 py-1.5 border border-slate-200 rounded-[8px] text-[13px] outline-none focus:border-slate-800 focus:border-[1.5px] h-[38px] resize-none"
                placeholder="Commentaires..."
                value={observation}
                onChange={e => setObservation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-[6px] text-[12px] hover:bg-slate-50 transition cursor-pointer"
            >
              Annuler
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white font-bold rounded-[6px] text-[12px] hover:bg-slate-800 transition cursor-pointer"
            >
              {isEditing ? "Enregistrer les modifications" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
