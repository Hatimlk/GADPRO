import { useState } from "react";
import { formatMAD, cn, getBankLogo } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";
import { Check } from "@/lib/types";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Printer, Eye, Pencil, Check as CheckIcon, X,
  FileText, RefreshCw, ChevronDown, Share, FileCheck, FileX, Upload, Send, Trash2
} from "lucide-react";
import { ViewCheckModal } from "@/components/ViewCheckModal";
import { DatePicker } from "@/components/DatePicker";
import * as XLSX from "xlsx";

const PdfIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#f8f9fa" stroke="#e9ecef" strokeWidth="2"/>
    <path d="M14 2V8H20" fill="#e9ecef"/>
    <rect x="3" y="10" width="13" height="6" rx="1" fill="#ef4444"/>
    <text x="4" y="14.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif">PDF</text>
  </svg>
);

const CsvIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="white" stroke="#84cc16" strokeWidth="2"/>
    <path d="M4 10H20" stroke="#84cc16" strokeWidth="2"/>
    <path d="M4 15H20" stroke="#84cc16" strokeWidth="2"/>
    <path d="M12 10V20" stroke="#84cc16" strokeWidth="2"/>
  </svg>
);

const ExcelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="12" height="16" rx="2" fill="#16a34a"/>
    <path d="M6 9L12 15M12 9L6 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <rect x="11" y="6" width="10" height="12" rx="1" fill="#22c55e" stroke="white" strokeWidth="1.5"/>
    <path d="M11 10H21M11 14H21M15 6V18" stroke="white" strokeWidth="1.5"/>
  </svg>
);

const maskRib = (rib: string) => {
  if (!rib) return "";
  const clean = rib.replace(/\s+/g, '');
  return clean.length >= 8 ? `${clean.substring(0, 4)}xxx${clean.substring(clean.length - 4)}` : rib;
};

export function RegleChecks() {
  const { checks, bankAccounts, updateCheckStatus, addCheck, instances, deleteCheck, deleteInstance } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkToView, setCheckToView] = useState<Check | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || "");
  const [sortBy, setSortBy] = useState("date");
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("Tous");

  // Filter only paid (Réglé) checks and paid instances without checks
  const paidChecks = checks.filter(c => c.status === "Payé");
  const checkFactures = new Set(checks.map(c => c.facture).filter(Boolean));
  
  const paidInstancesWithoutChecks = instances
    .filter(i => i.paymentDate && !checkFactures.has(i.facture))
    .map(i => ({
      id: `inst_${i.id}`,
      bankAccountId: "",
      type: (i.mdp as any) || "Autre",
      number: "-",
      partnerId: i.partnerId || "",
      partnerName: i.partnerName,
      emissionDate: i.date,
      dueDate: i.paymentDate!,
      amount: i.amount,
      status: "Payé" as any,
      facture: i.facture,
      note: i.observation || ""
    }));

  const regleChecks = [...paidChecks, ...paidInstancesWithoutChecks];

  const filteredChecks = regleChecks.filter(c => {
    const matchesType = typeFilter === "Tous" || c.type === typeFilter;
    const matchesSearch = c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.number.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date range filter
    if (startDate || endDate) {
      const checkDate = new Date(c.emissionDate);
      if (startDate && checkDate < startDate) return false;
      if (endDate && checkDate > endDate) return false;
    }

    return matchesType && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime();
    } else if (sortBy === "code") {
      return a.number.localeCompare(b.number);
    }
    return 0;
  });

  const totalRegle = regleChecks.reduce((s, c) => s + c.amount, 0);
  const totalCheques = regleChecks.filter(c => c.type === "Chèque").reduce((s, c) => s + c.amount, 0);
  const totalEffets = regleChecks.filter(c => c.type === "Effet").reduce((s, c) => s + c.amount, 0);
  const totalVirements = regleChecks.filter(c => c.type === "Virement").reduce((s, c) => s + c.amount, 0);

  const handlePrint = (check: Check) => {
    const account = bankAccounts.find(a => a.id === check.bankAccountId);
    const bankName = account?.bankName || "";
    const printState = {
      bankType: bankName ? `${bankName} - ${check.type}` : undefined,
      amount: String(check.amount),
      payee: check.partnerName,
      date: check.emissionDate,
      dueDate: check.dueDate,
      checkNumber: check.number,
      type: check.type,
    };
    localStorage.setItem("printData", JSON.stringify(printState));
    window.open("/impression", "_blank");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCheckIds(filteredChecks.map(c => c.id));
    } else {
      setSelectedCheckIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedCheckIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCheckIds.length} élément(s) réglé(s) ?`)) return;
    
    for (const id of selectedCheckIds) {
      if (id.startsWith("inst_")) {
        const actualId = parseInt(id.replace("inst_", ""));
        try {
          await deleteInstance(actualId, true);
        } catch (err) {
          console.error("Failed to delete instance", id, err);
        }
      } else {
        try {
          await deleteCheck(id);
        } catch (err) {
          console.error("Failed to delete check", id, err);
        }
      }
    }
    
    setSelectedCheckIds([]);
  };

  const getChecksToExport = () => {
    if (selectedCheckIds.length > 0) {
      return filteredChecks.filter(c => selectedCheckIds.includes(c.id));
    }
    return filteredChecks;
  };

  const handleExportCSV = (separator = ',') => {
    const checksToExport = getChecksToExport();
    const headers = ["Type", "Numéro", "Fournisseur / Bénéficiaire", "Date d'Émission", "Date d'Échéance", "Montant", "Facture", "Statut", "Note"];
    
    const rows = checksToExport.map(check => {
      return [
        check.type,
        check.number,
        check.partnerName,
        check.emissionDate,
        check.dueDate,
        check.amount,
        check.facture || "",
        check.status,
        check.note || ""
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(separator);
    });

    const csvContent = "\uFEFF" + [headers.join(separator), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export_cheques_regles_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    handleExportCSV(';');
  };

  const handleExportPDF = () => {
    const checksToExport = getChecksToExport();
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;

    const tableRows = checksToExport.map(check => {
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${check.type} / ${check.number}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${check.partnerName}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${check.emissionDate}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${check.dueDate}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatMAD(check.amount)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${check.status}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Export Chèques Réglés</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th { border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa !important; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            h1 { font-size: 18px; color: #333; }
          </style>
        </head>
        <body>
          <h1>Liste des Chèques/Effets Réglés (Payés)</h1>
          <p>Généré le: ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>Type / Numéro</th>
                <th>Fournisseur / Bénéficiaire</th>
                <th>Date d'Émission</th>
                <th>Date d'Échéance</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() { 
                window.print(); 
                setTimeout(function() { window.close(); }, 500);
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawDataArrays: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let headerRowIndex = -1;
        let keys: string[] = [];
        for (let i = 0; i < Math.min(20, rawDataArrays.length); i++) {
          const row = rawDataArrays[i];
          if (row && row.length > 2) {
            const rowStr = row.join("").toLowerCase();
            if (rowStr.includes("montant") || rowStr.includes("fournisseur") || rowStr.includes("num")) {
              headerRowIndex = i;
              keys = row.map(cell => String(cell || "").trim());
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          alert("Erreur: Impossible de trouver la ligne d'en-tête. Assurez-vous d'avoir les colonnes comme 'Montant', 'Fournisseur' ou 'Numéro'.");
          return;
        }

        const rawData: any[] = [];
        for (let i = headerRowIndex + 1; i < rawDataArrays.length; i++) {
          const rowArray = rawDataArrays[i];
          if (rowArray.every(cell => cell === "" || cell === null || cell === undefined)) continue;
          
          const rowObj: Record<string, any> = {};
          for (let j = 0; j < keys.length; j++) {
            if (keys[j]) {
              rowObj[keys[j]] = rowArray[j];
            }
          }
          rawData.push(rowObj);
        }

        const getColumnKey = (possibleNames: string[]) => {
          return keys.find(k => 
            possibleNames.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(p.toLowerCase().replace(/[^a-z0-9]/g, "")))
          ) || "";
        };

        const dateCol = getColumnKey(["date", "emission"]);
        const dueDateCol = getColumnKey(["echeance", "due"]);
        const partnerCol = getColumnKey(["fournisseur", "partenaire", "client", "nom", "beneficiaire"]);
        const amountCol = getColumnKey(["montant", "somme", "valeur", "amount"]);
        const typeCol = getColumnKey(["type", "mode"]);
        const numberCol = getColumnKey(["numero", "num"]);
        const factureCol = getColumnKey(["facture", "fac"]);

        if (!partnerCol || !amountCol || !numberCol) {
          alert("Erreur de format : Les colonnes 'Numéro', 'Fournisseur' et 'Montant' sont requises.");
          return;
        }

        let importedCount = 0;
        
        for (const row of rawData) {
          let emissionDateVal = new Date().toISOString().split("T")[0];
          const rawDate = row[dateCol];
          if (rawDate) {
            if (rawDate instanceof Date) {
              emissionDateVal = rawDate.toISOString().split("T")[0];
            } else {
              const strDate = String(rawDate).trim();
              const parts = strDate.split("/");
              if (parts.length === 3) {
                emissionDateVal = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              } else {
                emissionDateVal = strDate.includes("-") ? strDate : emissionDateVal;
              }
            }
          }

          let dueDateVal = emissionDateVal;
          const rawDueDate = row[dueDateCol];
          if (rawDueDate) {
            if (rawDueDate instanceof Date) {
              dueDateVal = rawDueDate.toISOString().split("T")[0];
            } else {
              const strDate = String(rawDueDate).trim();
              const parts = strDate.split("/");
              if (parts.length === 3) {
                dueDateVal = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              } else {
                dueDateVal = strDate.includes("-") ? strDate : dueDateVal;
              }
            }
          }

          let amountVal = parseFloat(String(row[amountCol]).replace(/[^0-9.-]/g, ""));
          if (isNaN(amountVal)) continue;

          const partnerVal = String(row[partnerCol] || "").trim();
          const numberVal = String(row[numberCol] || "").trim();
          if (!partnerVal || !numberVal) continue;

          const typeVal = String(row[typeCol] || "Chèque").trim();
          const isEffet = typeVal.toLowerCase().includes("effet");
          const typeFormatted = isEffet ? "Effet" : "Chèque";
          
          const factureVal = String(row[factureCol] || "").trim();
          
          // Fallback bank ID since we don't have it in standard template
          const fallbackBankId = bankAccounts[0]?.id || "b1";

          const newCheck = await addCheck({
            bankAccountId: fallbackBankId,
            type: typeFormatted,
            number: numberVal,
            partnerId: `p_${Date.now()}_${importedCount}`,
            partnerName: partnerVal,
            emissionDate: emissionDateVal,
            dueDate: dueDateVal,
            amount: amountVal,
            facture: factureVal || undefined,
            note: "Importé via Excel",
          });
          
          if (newCheck && newCheck.id) {
            await updateCheckStatus(newCheck.id, "Payé");
          }

          importedCount++;
        }

        alert(`${importedCount} chèques/effets réglés importés avec succès.`);
        e.target.value = "";
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] mb-1 font-bold text-slate-900 tracking-tight">Chèques/Effets/Virements Réglés</h1>
          <div className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
            <span>Tableau de Bord</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>Chèques/Effets/Virements Réglés</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <label htmlFor="excel-import-regle" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-[8px] text-[12px] font-bold transition flex items-center gap-2 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" /> Importer Excel
          </label>
          <input 
            type="file" 
            id="excel-import-regle" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleImportExcelFile} 
            className="hidden" 
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-green-100 bg-green-50 text-green-500 flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Total Réglé</span>
            <span className="text-[11px] font-medium text-slate-500">{regleChecks.length} Valeurs</span>
            <span className="text-[16px] font-bold text-slate-900 mt-0.5">{formatMAD(totalRegle)}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-blue-100 bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800 font-sans">Chèques Payés</span>
            <span className="text-[11px] font-medium text-slate-500">{regleChecks.filter(c => c.type === "Chèque").length} Chèques</span>
            <span className="text-[16px] font-bold text-slate-900 mt-0.5">{formatMAD(totalCheques)}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-orange-100 bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Effets Payés</span>
            <span className="text-[11px] font-medium text-slate-500">{regleChecks.filter(c => c.type === "Effet").length} Effets</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-purple-100 bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Virements Payés</span>
            <span className="text-[11px] font-medium text-slate-500">{regleChecks.filter(c => c.type === "Virement").length} Virements</span>
            <span className="text-[16px] font-bold text-slate-900 mt-0.5">{formatMAD(totalVirements)}</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white filters-bar">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <DatePicker 
              label="Date de début" 
              value={startDate} 
              onChange={setStartDate} 
            />

            <DatePicker 
              label="Date de fin" 
              value={endDate} 
              onChange={setEndDate} 
            />

            <div className="relative flex-1 max-w-[150px]">
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Type</span>
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="Tous">Tous les types</option>
                <option value="Chèque">Chèque</option>
                <option value="Effet">Effet</option>
                <option value="Virement">Virement</option>
                <option value="Espèce">Espèce</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 max-w-[200px]">
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Trier par</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="date">Date de création</option>
                <option value="code">Code du chèque (A-Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-[250px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher Personne, Société, Numéro RIB.."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-[6px] text-slate-500 hover:bg-slate-50 transition bg-white cursor-pointer relative z-10"
              >
                <Share className="w-4 h-4" />
              </button>

              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsExportMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100 py-2 z-40 flex flex-col gap-1">
                    <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left border-none bg-transparent cursor-pointer">
                      <PdfIcon />
                      <span className="text-[12px] font-bold text-slate-700">Exporter en PDF</span>
                    </button>
                    <button onClick={() => handleExportCSV(',')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left border-none bg-transparent cursor-pointer">
                      <CsvIcon />
                      <span className="text-[12px] font-bold text-slate-700">Exporter en CSV</span>
                    </button>
                    <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left border-none bg-transparent cursor-pointer">
                      <ExcelIcon />
                      <span className="text-[12px] font-bold text-slate-700">Exporter pour EXCEL</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {selectedCheckIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-[6px] text-[12px] font-semibold hover:bg-red-600 transition shadow-sm border-none cursor-pointer"
                title="Supprimer la sélection"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Supprimer ({selectedCheckIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] border-y border-slate-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredChecks.length > 0 && filteredChecks.every(c => selectedCheckIds.includes(c.id))}
                    onChange={handleSelectAll}
                    className="rounded-[4px] border-slate-300 w-4 h-4 cursor-pointer accent-primary" 
                  />
                </th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Action</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Type/Numéro</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Fournisseur/Bénéficiaire / Date d'Émission</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Date d'Échéance</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Montant/Facture</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Statut/Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChecks.map((check) => {
                return (
                  <tr key={check.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedCheckIds.includes(check.id)}
                        onChange={() => handleSelectOne(check.id)}
                        className="rounded-[4px] border-slate-300 w-4 h-4 cursor-pointer accent-primary" 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span title="Modifier Statut">
                            <Pencil
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(actionMenuOpenId === check.id ? null : check.id);
                              }}
                              className="w-4 h-4 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors relative z-10"
                            />
                          </span>
                          {actionMenuOpenId === check.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(null); }}></div>
                              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-40 bg-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100 py-2 w-40 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-100 rotate-45"></div>
                                
                                {check.id.startsWith("inst_") ? (
                                  <div className="px-4 py-2 text-[10px] text-slate-500 text-center">Géré dans Instances</div>
                                ) : (
                                  <>
                                    <button onClick={() => { updateCheckStatus(check.id, 'En Circulation'); setActionMenuOpenId(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors w-full text-left border-none bg-transparent cursor-pointer relative z-10">
                                      <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                                        <RefreshCw className="w-2.5 h-2.5" strokeWidth={3} />
                                      </div>
                                      <span className="text-orange-500 text-[11px] font-bold">Réactiver (Circulation)</span>
                                    </button>

                                    <button onClick={() => { updateCheckStatus(check.id, 'Annulé'); setActionMenuOpenId(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors w-full text-left border-none bg-transparent cursor-pointer relative z-10">
                                      <div className="w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0">
                                        <X className="w-2.5 h-2.5" strokeWidth={3} />
                                      </div>
                                      <span className="text-slate-500 text-[11px] font-bold">Annuler</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <span title="Voir détails">
                          {check.id.startsWith("inst_") ? null : (
                            <Eye
                              onClick={() => setCheckToView(check as Check)}
                              className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                            />
                          )}
                        </span>
                        <span title="Imprimer">
                          {check.id.startsWith("inst_") ? null : (
                            <Printer
                              onClick={() => handlePrint(check as Check)}
                              className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                            />
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn("px-2 py-0.5 rounded-[4px] text-[10px] font-bold text-white", check.type === 'Effet' ? 'bg-[#FF9800]' : (check.type === 'Chèque' ? 'bg-[#1E293B]' : 'bg-slate-500'))}>
                          {check.type}
                        </span>
                        <span className="font-bold text-slate-800 text-[11px]">{check.number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-slate-800 text-[12px]">{check.partnerName}</span>
                        <span className="text-slate-500 font-medium text-[11px]">{check.emissionDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <FileCheck className="w-3 h-3" /> Réglé (Payé)
                        </span>
                        <span className="text-slate-500 font-medium text-[11px]">{check.dueDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-slate-800 text-[12px]">{formatMAD(check.amount)}</span>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                          {check.facture ? `Facture : ${check.facture}` : 'service'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end sm:items-start gap-1">
                        <span className="px-3 py-1.5 rounded-full text-[11px] font-bold inline-block min-w-[90px] text-center bg-green-50 text-green-600">
                          Payé
                        </span>
                        {check.note && (
                          <span className="text-slate-400 font-medium text-[10px] truncate max-w-[120px]" title={check.note}>
                            {check.note}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredChecks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Aucun chèque/effet réglé trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ViewCheckModal check={checkToView} onClose={() => setCheckToView(null)} />
    </div>
  );
}
