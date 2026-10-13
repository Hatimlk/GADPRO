import { useState } from "react";
import { Printer, Plus, Trash2, Send } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { formatMAD } from "@/lib/utils";
import { amountToFrench } from "@/lib/numberToLetters";

interface VirementLine {
  id: string;
  beneficiary: string;
  bank: string;
  rib: string;
  amount: number;
}

export function Virements() {
  const { bankAccounts, partnerList, addInstance } = useApp();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<VirementLine[]>([
    { id: Date.now().toString(), beneficiary: "", bank: "Banque Populaire", rib: "", amount: 0 }
  ]);

  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now().toString(), beneficiary: "", bank: "Banque Populaire", rib: "", amount: 0 }]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const handleLineChange = (id: string, field: keyof VirementLine, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const newLine = { ...l, [field]: value };
        
        // Auto-fill bank and rib if beneficiary is selected from partnerList
        if (field === "beneficiary") {
          const partner = partnerList.find(p => p.name === value);
          if (partner) {
            const contactStr = partner.contact || "";
            let bank = contactStr;
            if (contactStr.includes(' / ')) {
              bank = contactStr.split(' / ')[0];
            }
            newLine.bank = bank;
            newLine.rib = partner.phone || "";
          }
        }
        
        return newLine;
      }
      return l;
    }));
  };

  const totalAmount = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const handlePrint = async () => {
    try {
      for (const line of lines) {
        if (line.beneficiary && line.amount > 0) {
          const partner = partnerList.find(p => p.name === line.beneficiary);
          await addInstance({
            date: date,
            facture: `VIR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
            partnerId: partner?.id.toString() || "",
            partnerName: line.beneficiary,
            amount: line.amount,
            paymentDelay: "Immédiat",
            convention: partner?.convention || "Non défini",
            mdp: "Virement",
            paymentDate: date,
            observation: "Généré via Ordre de Virement",
          });
        }
      }
      window.print();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout aux Instances.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 print:hidden">
        <div>
          <h1 className="text-[18px] mb-0 font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Ordres de Virement
          </h1>
          <p className="text-[12px] text-slate-500 m-0">Générez et imprimez vos ordres de virement bancaire.</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={!selectedAccount || lines.length === 0 || totalAmount === 0}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-[8px] text-[13px] font-semibold hover:bg-slate-800 transition shadow-sm border-none cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          Imprimer l'Ordre
        </button>
      </div>

      <div className="bg-white p-6 rounded-[12px] border border-slate-200 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-2">Compte à débiter</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-[8px] text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer"
            >
              <option value="" disabled hidden>Sélectionner un compte...</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} - {account.rib}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-2">Date d'exécution</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-slate-800 m-0">Bénéficiaires</h3>
            <button
              onClick={handleAddLine}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/80 bg-transparent border-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une ligne
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.id} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-[8px]">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <input
                      type="text"
                      list="partners-virement-list"
                      placeholder="Bénéficiaire"
                      value={line.beneficiary}
                      onChange={(e) => handleLineChange(line.id, "beneficiary", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <datalist id="partners-virement-list">
                      {partnerList.map(p => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Banque"
                      value={line.bank}
                      onChange={(e) => handleLineChange(line.id, "bank", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="N° de Compte (RIB)"
                      value={line.rib}
                      onChange={(e) => handleLineChange(line.id, "rib", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Montant"
                      value={line.amount || ""}
                      onChange={(e) => handleLineChange(line.id, "amount", parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                {lines.length > 1 && (
                  <button
                    onClick={() => handleRemoveLine(line.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-[6px] transition bg-transparent border-none cursor-pointer mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <div className="bg-slate-100 px-4 py-2 rounded-[8px] flex items-center gap-4">
              <span className="text-[12px] font-semibold text-slate-500 uppercase">Total :</span>
              <span className="text-[16px] font-bold text-slate-900">{formatMAD(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zone d'impression */}
      <div id="print-section" className="hidden print:block w-full">
        {lines.map((line, idx) => (
          <div key={line.id || idx} className="print-container bg-white text-black font-sans text-[13px]">
            
            <div className="flex justify-center pt-24">
              <div className="ml-auto w-[400px] grid grid-cols-[100px_1fr] gap-1">
                <div>Banque:</div>
                <div className="font-bold">{selectedAccount?.bankName}</div>
                <div>Agence :</div>
                <div>Bd Hassan II BP 246, Agadir</div>
                <div>N° de RIB</div>
                <div>{selectedAccount?.rib}</div>
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <div className="ml-auto w-[400px] flex">
                <div className="w-[200px]">Agadir, le</div>
                <div>{new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
              </div>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <div className="w-[100px]">Objet:</div>
              <div className="underline">Ordre de virement</div>
            </div>

            <div className="mt-10">
              <p className="mb-6">Monsieur,</p>
              
              <p className="mb-6">Nous vous prions de bien vouloir virer, par le débit de notre compte :</p>
              
              <div className="flex items-center mb-4">
                <div className="w-[150px]">la somme de :</div>
                <div className="border-[2px] border-black px-2 py-1 w-[180px] text-right font-medium">
                  {formatMAD(line.amount || 0).replace('MAD', '').trim()}
                </div>
                <span className="ml-1">MAD({amountToFrench(line.amount || 0)})</span>
              </div>
              
              <div className="flex items-start mb-6">
                <div className="w-[150px] mt-1">en faveur de :</div>
                <div className="flex-1">
                  <div className="border-[2px] border-black px-2 py-1 w-[450px] text-center mb-1 uppercase font-bold">
                    {line.beneficiary}
                  </div>
                  <div className="text-[12px] leading-snug">
                    <div>{line.bank?.split(' - ')[0]}</div>
                    {line.bank?.split(' - ')[1] && <div>{line.bank.split(' - ')[1]}</div>}
                    <div>{line.rib}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-[12.5px] leading-relaxed">
                <p>Nous vous remercions de votre collaboration et vous prions d'agréer, Monsieur,</p>
                <p>l'expression de nos sentiments distingués.</p>
              </div>
            </div>

            <div className="mt-20 flex justify-end pr-16">
              <div className="text-center">
                <div className="font-bold mb-1 text-[15px] tracking-wide" style={{ fontFamily: '"Courier New", Courier, monospace' }}>Le Directeur Général</div>
                <div className="text-[12px]">Franck GUILLET</div>
              </div>
            </div>

          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          html, body {
            background: white;
            color: black;
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .print-container {
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            box-sizing: border-box;
            page-break-after: always;
          }
          .print-container:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
