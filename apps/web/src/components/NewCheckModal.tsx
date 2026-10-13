import { useState, useEffect, type FormEvent } from "react";
import { useApp } from "@/lib/AppContext";
import type { Check, CheckType } from "@/lib/types";
import { DatePicker } from "./DatePicker";
import { ChevronDown } from "lucide-react";

interface NewCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  editCheck?: Check | null;
  prefillData?: {
    facture: string;
    partnerName: string;
    amount: number;
    type: CheckType;
    instanceId?: number;
  } | null;
}

export function NewCheckModal({ isOpen, onClose, editCheck, prefillData }: NewCheckModalProps) {
  const { addCheck, updateCheck, bankAccounts, checkbooks, instances } = useApp();
  
  const [docType, setDocType] = useState<CheckType | "">("");
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [checkbookId, setCheckbookId] = useState("");
  
  const [emissionDate, setEmissionDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  
  const [isCancelled, setIsCancelled] = useState(false);
  const [facture, setFacture] = useState("");
  const [note, setNote] = useState("");
  const [invoiceInputType, setInvoiceInputType] = useState<"select" | "text">("select");

  const pendingInvoices = instances.filter(inst => !inst.paymentDate);

  useEffect(() => {
    if (editCheck) {
      setDocType(editCheck.type);
      setAmount(String(editCheck.amount));
      setBeneficiary(editCheck.partnerName);
      setCheckNumber(editCheck.number);
      setBankAccountId(editCheck.bankAccountId);
      setCheckbookId(editCheck.checkbookId || "");
      setEmissionDate(editCheck.emissionDate ? new Date(editCheck.emissionDate) : null);
      setDueDate(editCheck.dueDate ? new Date(editCheck.dueDate) : null);
      setIsCancelled(editCheck.status === "Annulé");
      setFacture(editCheck.facture || "");
      setNote(editCheck.note || "");
      setInvoiceInputType("text");
    } else if (prefillData) {
      setDocType(prefillData.type);
      setAmount(String(prefillData.amount));
      setBeneficiary(prefillData.partnerName);
      setCheckNumber("");
      const bpAccount = bankAccounts.find(a => a.bankName.toUpperCase().includes("POPULAIRE") || a.bankName.toUpperCase().includes("BP"));
      setBankAccountId(bpAccount ? bpAccount.id : (bankAccounts[0]?.id || ""));
      setCheckbookId("");
      setEmissionDate(null);
      setDueDate(null);
      setIsCancelled(false);
      setFacture(prefillData.facture);
      setNote("");
      setInvoiceInputType("select");
    } else {
      setDocType("");
      setAmount("");
      setBeneficiary("");
      setCheckNumber("");
      const bpAccount = bankAccounts.find(a => a.bankName.toUpperCase().includes("POPULAIRE") || a.bankName.toUpperCase().includes("BP"));
      setBankAccountId(bpAccount ? bpAccount.id : (bankAccounts[0]?.id || ""));
      setCheckbookId("");
      setEmissionDate(null);
      setDueDate(null);
      setIsCancelled(false);
      setFacture("");
      setNote("");
      setInvoiceInputType("select");
    }
  }, [editCheck, prefillData, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!editCheck;

  const availableCheckbooks = checkbooks.filter(
    cb => cb.bankAccountId === bankAccountId && (docType ? cb.type === docType : true) && (isEditing ? true : cb.remaining > 0)
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!docType) return;
    const num = parseFloat(amount.replace(/,/g, "."));
    if (isNaN(num)) return;
    if (!bankAccounts.find(a => a.id === bankAccountId)) return;

    const getLocalDateString = (d: Date | null) => {
      if (!d) return new Date().toISOString().split("T")[0]; // default fallback
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const emDate = getLocalDateString(emissionDate);
    const dDate = getLocalDateString(dueDate);

    if (isEditing) {
      updateCheck(editCheck.id, {
        type: docType as CheckType,
        number: checkNumber,
        partnerName: beneficiary,
        bankAccountId,
        emissionDate: emDate,
        dueDate: dDate,
        amount: num,
        facture: facture || undefined,
        note: note || undefined,
      });
    } else {
      addCheck({
        bankAccountId,
        checkbookId: checkbookId || undefined,
        type: docType as CheckType,
        number: checkNumber,
        partnerId: "",
        partnerName: beneficiary,
        emissionDate: emDate,
        dueDate: dDate,
        amount: num,
        facture: facture || undefined,
        note: note || undefined,
        status: prefillData?.instanceId ? "Payé" : undefined,
        instanceIdToDelete: prefillData?.instanceId
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-4xl overflow-hidden flex flex-col">
        <div className="p-8">
          <h2 className="text-[18px] font-bold text-slate-900 mb-8">
            Delivré un Nouveau Chèque/effet
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <select 
                  className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-500 bg-white appearance-none outline-none focus:border-slate-400"
                  value={bankAccountId} 
                  onChange={e => setBankAccountId(e.target.value)} 
                  required
                >
                  <option value="" disabled>Sélectionner un RIB</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bankName} - {a.rib}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select 
                  className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-500 bg-white appearance-none outline-none focus:border-slate-400"
                  value={checkbookId} 
                  onChange={e => setCheckbookId(e.target.value)}
                >
                  <option value="" disabled>Sélectionner un carnet</option>
                  {availableCheckbooks.map(cb => (
                    <option key={cb.id} value={cb.id}>{cb.type} N°{cb.startNumber}–{cb.endNumber}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select 
                  className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-500 bg-white appearance-none outline-none focus:border-slate-400"
                  value={docType} 
                  onChange={e => setDocType(e.target.value as CheckType)}
                  required
                >
                  <option value="" disabled>Sélectionner une valeur</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Effet">Effet</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Numéro de document" 
                  value={checkNumber} 
                  onChange={e => setCheckNumber(e.target.value)} 
                  className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400 placeholder:text-slate-400" 
                  required 
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isCancelled} onChange={e => setIsCancelled(e.target.checked)} />
                <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[26px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-slate-400"></div>
              </label>
              <span className="text-[14px] font-bold text-slate-600">Ce chèque est annulé</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <input 
                type="text" 
                placeholder="Fournisseur / Bénéficiaire" 
                value={beneficiary} 
                onChange={e => setBeneficiary(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400 placeholder:text-slate-400" 
                required 
              />
              <input 
                type="text" 
                placeholder="Montant" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400 placeholder:text-slate-400" 
                required 
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="h-[46px]">
                <DatePicker 
                  label="Date délivrance" 
                  value={emissionDate} 
                  onChange={setEmissionDate} 
                  placeholder="07/06/2026" 
                />
              </div>
              <div className="h-[46px]">
                <DatePicker 
                  label="Date d'Échéance" 
                  value={dueDate} 
                  onChange={setDueDate} 
                />
              </div>
              <div className="h-[46px]">
                {invoiceInputType === "select" ? (
                  <div className="relative h-full">
                    <select 
                      className="w-full h-full px-4 pr-12 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-800 bg-white appearance-none outline-none focus:border-slate-400"
                      value={facture}
                      onChange={e => {
                        const val = e.target.value;
                        setFacture(val);
                        const matchingInst = pendingInvoices.find(inst => inst.facture === val);
                        if (matchingInst) {
                          setBeneficiary(matchingInst.partnerName);
                          setAmount(String(matchingInst.amount));
                          setDocType(matchingInst.mdp === "Effet" ? "Effet" : "Chèque");
                        }
                      }}
                    >
                      <option value="">Associer à une facture (Optionnel)</option>
                      {pendingInvoices.map(inst => (
                        <option key={inst.id} value={inst.facture}>
                          {inst.facture} - {inst.partnerName} ({inst.amount} MAD)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-12 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button 
                      type="button"
                      onClick={() => setInvoiceInputType("text")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 hover:underline font-bold bg-transparent border-none cursor-pointer"
                    >
                      Saisir
                    </button>
                  </div>
                ) : (
                  <div className="relative h-full">
                    <input 
                      type="text" 
                      placeholder="Facture N° (facultatif)" 
                      value={facture} 
                      onChange={e => setFacture(e.target.value)} 
                      className="w-full h-full px-4 pr-16 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400 placeholder:text-slate-400" 
                    />
                    <button 
                      type="button"
                      onClick={() => setInvoiceInputType("select")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 hover:underline font-bold bg-transparent border-none cursor-pointer"
                    >
                      Choisir
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <textarea 
                placeholder="Note (facultatif)" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-200 rounded-[8px] text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400 resize-none placeholder:text-slate-400" 
                rows={3}
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-2.5 text-[14px] font-bold text-slate-800 bg-white border border-slate-200 rounded-[8px] hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 text-[14px] font-bold text-white bg-[#1E293B] rounded-[8px] hover:bg-slate-800 transition cursor-pointer border-none"
              >
                Soumettre
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
