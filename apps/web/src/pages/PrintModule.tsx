import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Printer, Save, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { amountToFrench } from "@/lib/numberToLetters";
import { useApp } from "@/lib/AppContext";

type ElementId = 'amountLetters' | 'amountNumbers' | 'payee' | 'place' | 'date' | 'dueDate' | 'cause';

interface Position {
  x: number;
  y: number;
}

const DEFAULT_CHEQUE_POSITIONS: Record<ElementId, Position> = {
  amountLetters: { x: 270, y: 223 },
  amountNumbers: { x: 640, y: 178 },
  payee: { x: 330, y: 195 },
  place: { x: 430, y: 333 },
  date: { x: 640, y: 333 },
  dueDate: { x: 640, y: 30 },
  cause: { x: 120, y: 190 },
};

const DEFAULT_EFFET_POSITIONS: Record<ElementId, Position> = {
  dueDate: { x: 630, y: 65 },
  amountNumbers: { x: 600, y: 80 },
  payee: { x: 510, y: 250 },
  place: { x: 370, y: 295 },
  date: { x: 530, y: 295 },
  amountLetters: { x: 580, y: 290 },
  cause: { x: 420, y: 310 },
};

const BANKS = [
  { name: "ATTIJARIWAFA BANK", chequeFile: "ATTIJARIWAFA BANK.png", effetFile: "ATTIJARIWAFA BANK.png" },
  { name: "BANK OF AFRICA", chequeFile: "BANK OF AFRICA.png", effetFile: "BANK OF AFRICA.png" },
  { name: "BMCI", chequeFile: "BMCI.png", effetFile: "BMCI.png" },
  { name: "BANQUE POPULAIRE", chequeFile: "BP.png", effetFile: "BP.png" },
  { name: "CIH BANK", chequeFile: "CIH.png", effetFile: "CIH.png" },
  { name: "CREDIT DU MAROC", chequeFile: "CREDIT DU MAROC.png", effetFile: "CREDIT MAROC.png" },
  { name: "CREDIT AGRICOLE", chequeFile: "CREDIT AGRICOLE.png", effetFile: "CREDIT AGRICOLE.png" },
  { name: "AL BARID BANK", chequeFile: "BARID BANK.png", effetFile: "BARID BANK.png" },
  { name: "SOCIETE GENERALE", chequeFile: "SOCIETE GENERALE.png", effetFile: "SOCIETE GENERALE.png" }
];

export function PrintModule() {
  const location = useLocation();
  const { addCheck, bankAccounts, addInstance, partnerList } = useApp();

  const [bankType, setBankType] = useState("BANQUE POPULAIRE - Chèque");
  const [amount, setAmount] = useState("");
  const [amountLetters, setAmountLetters] = useState("");
  const [payee, setPayee] = useState("");
  const [place, setPlace] = useState("Agadir");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cause, setCause] = useState("");
  const [checkType, setCheckType] = useState("Chèque normal");

  const [positions, setPositions] = useState<Record<ElementId, Position>>(DEFAULT_CHEQUE_POSITIONS);
  const [globalOffset, setGlobalOffset] = useState<Position>({ x: 0, y: 0 });

  const isEffet = bankType.includes("- Effet");
  const [isFromExisting, setIsFromExisting] = useState(false);

  useEffect(() => {
    let state = location.state as Record<string, string> | null;
    if (!state) {
      const stored = localStorage.getItem("printData");
      if (stored) {
        try {
          state = JSON.parse(stored);
          // Optional: clear it so it doesn't get reused unintentionally
          // localStorage.removeItem("printData");
        } catch (e) { }
      }
    }

    if (state) {
      if (state.checkNumber || state.source === "instance") setIsFromExisting(true);
      if (state.bankType) setBankType(state.bankType);
      if (state.amount) setAmount(state.amount);
      if (state.payee) setPayee(state.payee);
      if (state.date) setDate(state.date);
      if (state.dueDate) setDueDate(state.dueDate);
      if (state.type === "Effet" && state.bankType) {
        setBankType(state.bankType);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const storageKey = `positions_${bankType.replace(/\s+/g, '_')}`;
    const defaultPos = isEffet ? DEFAULT_EFFET_POSITIONS : DEFAULT_CHEQUE_POSITIONS;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPositions({ ...defaultPos, ...parsed });
      } catch (e) {
        console.error("Error parsing saved positions", e);
        setPositions(defaultPos);
      }
    } else {
      setPositions(defaultPos);
    }

    const savedGlobal = localStorage.getItem("printerGlobalOffset");
    if (savedGlobal) {
      try {
        setGlobalOffset(JSON.parse(savedGlobal));
      } catch (e) {}
    }
  }, [bankType, isEffet]);

  useEffect(() => {
    const num = parseFloat(amount.replace(/ /g, "").replace(/,/g, "."));
    if (!isNaN(num) && num >= 0) {
      setAmountLetters(amountToFrench(num));
    } else if (amount === "") {
      setAmountLetters("");
    }
  }, [amount]);

  const handleDragEnd = (id: ElementId, info: any) => {
    setPositions(prev => ({
      ...prev,
      [id]: {
        x: prev[id].x + info.offset.x,
        y: prev[id].y + info.offset.y
      }
    }));
  };

  const savePositions = () => {
    const storageKey = `positions_${bankType.replace(/\s+/g, '_')}`;
    localStorage.setItem(storageKey, JSON.stringify(positions));
    alert(`Positions enregistrées avec succès pour ${bankType} !`);
  };

  const resetPositions = () => {
    const defaultPos = isEffet ? DEFAULT_EFFET_POSITIONS : DEFAULT_CHEQUE_POSITIONS;
    const storageKey = `positions_${bankType.replace(/\s+/g, '_')}`;
    setPositions(defaultPos);
    localStorage.removeItem(storageKey);
  };


  const handlePrint = () => {
    window.print();

    if (!isFromExisting) {
      const bankName = bankType.split(" - ")[0];
      const type = bankType.includes("- Effet") ? "Effet" : "Chèque";

      let account = bankAccounts.find(a => a.bankName.toUpperCase() === bankName.toUpperCase());
      let bankAccountId = account ? account.id : (bankAccounts[0]?.id || "b1");

      const parsedAmount = parseFloat(amount.replace(/ /g, "").replace(/,/g, ".")) || 0;

      const parseDate = (d: string) => {
        if (!d) return new Date().toISOString().split("T")[0];
        const parts = d.split("/");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return d;
      };

      const finalDate = parseDate(date);
      const finalDueDate = type === "Effet" ? parseDate(dueDate) : finalDate;

      addCheck({
        bankAccountId,
        type: type as "Chèque" | "Effet",
        number: `IMP-${Date.now().toString().slice(-4)}`,
        partnerId: `p_${Date.now()}`,
        partnerName: payee || "Inconnu",
        emissionDate: finalDate,
        dueDate: finalDueDate,
        amount: parsedAmount,
        note: "Reçu",
      });

      if (type === "Effet") {
        addInstance({
          date: finalDate,
          facture: cause || "Reçu d'impression",
          partnerId: `p_${Date.now()}`,
          partnerName: payee || "Inconnu",
          amount: parsedAmount,
          paymentDelay: "-",
          convention: "-",
          mdp: "-",
          paymentDate: null,
          observation: "Généré automatiquement via l'impression"
        });
      }
      setIsFromExisting(true);
    }
  };

  const getFormattedAmount = () => {
    if (!amount) return "Montant";
    const num = parseFloat(amount.replace(/ /g, "").replace(/,/g, "."));
    if (isNaN(num)) return `#${amount}#`;
    const parts = num.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `#${parts.join(",")}#`;
  };

  const wrapText = (text: string, maxChars: number) => {
    if (!text) return ["Montant en lettres"];
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + word).length > maxChars) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine += word + " ";
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  };

  const amountLettersLines = wrapText(amountLetters, isEffet ? 30 : 45);

  const elements = [
    { id: 'amountLetters' as ElementId, text: amountLettersLines, className: `font-bold uppercase ${isEffet ? 'text-center text-[10px]' : 'text-[11px]'}` },
    { id: 'amountNumbers' as ElementId, text: getFormattedAmount(), className: "font-bold text-[14px] tracking-wider" },
    { id: 'payee' as ElementId, text: payee || "Nom du fournisseur/bénéficiaire", className: "font-bold uppercase text-[12px]" },
    { id: 'place' as ElementId, text: place || "Ville", className: "font-bold uppercase text-[12px]" },
    { id: 'date' as ElementId, text: date || "Date", className: "font-bold text-[12px]" },
  ];

  if (isEffet) {
    elements.push({ id: 'dueDate' as ElementId, text: dueDate || "Date d'échéance", className: "font-bold text-[12px]" });
    elements.push({ id: 'cause' as ElementId, text: cause || "La cause", className: "font-bold text-[12px]" });
  }

  const selectedBankObj = BANKS.find(b => bankType.toLowerCase().startsWith(b.name.toLowerCase()));
  let bgImage = '';
  if (selectedBankObj) {
    if (isEffet && selectedBankObj.effetFile) {
      bgImage = `/effet/${selectedBankObj.effetFile}`;
    } else if (!isEffet && selectedBankObj.chequeFile) {
      bgImage = `/Checks/${selectedBankObj.chequeFile}`;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 print:hidden">
        <div>
          <h1 className="text-[18px] mb-0 font-bold text-slate-900 tracking-tight">Impression</h1>
          <p className="text-[12px] text-slate-500 m-0">Ajustez les positions et imprimez vos chèques ou effets.</p>
        </div>

      </div>

      <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              🏦 La banque
            </label>
            <select
              value={bankType}
              onChange={(e) => setBankType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-primary/10 text-primary border-primary/20 font-semibold"
            >
              <optgroup label="Chèques">
                {BANKS.filter(b => b.chequeFile).map(b => (
                  <option key={`${b.name}-cheque`} value={`${b.name} - Chèque`}>{b.name} - Chèque</option>
                ))}
              </optgroup>
              <optgroup label="Effets">
                {BANKS.filter(b => b.effetFile).map(b => (
                  <option key={`${b.name}-effet`} value={`${b.name} - Effet`}>{b.name} - Effet</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              $ Montant
            </label>
            <input
              type="text"
              placeholder="Montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              👤 A l'ordre de
            </label>
            <datalist id="partners-list">
              {partnerList.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <input
              type="text"
              list="partners-list"
              placeholder="Fournisseur / Bénéficiaire"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-blue-50/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              📍 Fait à
            </label>
            <input
              type="text"
              placeholder="Ville"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-blue-50/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              📅 Date
            </label>
            <input
              type="text"
              placeholder="JJ/MM/AAAA"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-blue-50/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              ≡ Options
            </label>
            <select
              value={checkType}
              onChange={(e) => setCheckType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-primary/10 text-primary border-primary/20"
            >
              <option value="Chèque normal">Chèque normal</option>
              <option value="Chèque barré">Chèque barré</option>
            </select>
          </div>
        </div>

        {isEffet && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                📅 Date d'échéance
              </label>
              <input
                type="text"
                placeholder="JJ/MM/AAAA"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                ℹ La cause
              </label>
              <input
                type="text"
                placeholder="Ex: Facture N°..."
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 overflow-x-auto pb-8 print:p-0 print:m-0 print:overflow-visible">

        {/* Screen Version (Framer Motion) */}
        <div
          className="relative bg-[#FDFBF2] border border-slate-300 shadow-md rounded-[4px] overflow-hidden select-none print:hidden"
          style={{ width: '800px', height: '350px', fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {bgImage && (
            <img
              src={bgImage}
              alt="Background"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-90"
            />
          )}

          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag
              dragMomentum={false}
              onDragEnd={(e, info) => handleDragEnd(el.id, info)}
              initial={{ x: positions[el.id].x, y: positions[el.id].y }}
              animate={{ x: positions[el.id].x, y: positions[el.id].y }}
              className={`absolute left-0 top-0 cursor-move text-slate-800 px-2 py-1 rounded border border-transparent hover:border-blue-400 hover:bg-blue-50/50 ${el.className} ${el.id === 'amountLetters' ? '' : 'whitespace-nowrap'}`}
              style={{ x: positions[el.id].x, y: positions[el.id].y }}
            >
              {Array.isArray(el.text) ? (
                <div style={{ lineHeight: isEffet ? '1.2' : '2' }} className={isEffet ? "text-center" : ""}>
                  {el.text.map((line, i) => (
                    <div key={i} className="whitespace-nowrap">{line}</div>
                  ))}
                </div>
              ) : (
                el.text
              )}
            </motion.div>
          ))}
        </div>

        {/* Print Version (Pure CSS) */}
        <div
          id="printable-check"
          className="hidden print:block absolute m-0 p-0 bg-transparent border-none shadow-none select-none"
          style={{ width: '800px', height: '350px' }}
        >
          {elements.map((el) => (
            <div
              key={el.id}
              className={`absolute left-0 top-0 text-black px-2 py-1 ${el.className} ${el.id === 'amountLetters' ? '' : 'whitespace-nowrap'}`}
              style={{ transform: `translate(${positions[el.id].x}px, ${positions[el.id].y}px)` }}
            >
              {Array.isArray(el.text) ? (
                <div style={{ lineHeight: isEffet ? '1.2' : '2' }} className={isEffet ? "text-center" : ""}>
                  {el.text.map((line, i) => (
                    <div key={i} className="whitespace-nowrap">{line}</div>
                  ))}
                </div>
              ) : (
                el.text
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-[8px] text-[14px] font-semibold hover:bg-slate-800 transition shadow-sm border-none cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
          <button
            onClick={resetPositions}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-[8px] text-[13px] font-semibold hover:bg-slate-50 transition shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser les positions
          </button>
          <button
            onClick={savePositions}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-[8px] text-[13px] font-semibold hover:opacity-90 transition shadow-sm border-none cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Enregistrer les positions
          </button>
        </div>

      </div>

      <style>{`
        @page {
          size: landscape;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            min-height: 100vh !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-check, #printable-check * {
            visibility: visible;
          }
          #printable-check {
            position: absolute;
            right: 0;
            left: auto;
            top: 50% !important;
            transform: translate(${globalOffset.x}px, calc(-50% + ${globalOffset.y}px)) !important;
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif !important;
          }
        }
      `}</style>
    </div>
  );
}
