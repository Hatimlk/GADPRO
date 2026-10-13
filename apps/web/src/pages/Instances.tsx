import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMAD, cn } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";
import { Instance } from "@/lib/types";
import {
  Search, Printer, Pencil, Trash2, ChevronDown, Share, FileText, Plus, HelpCircle, CreditCard, Upload
} from "lucide-react";
import { NewInstanceModal } from "@/components/NewInstanceModal";
import { DatePicker } from "@/components/DatePicker";
import { NewCheckModal } from "@/components/NewCheckModal";
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

const getDuration = (invoiceDateStr: string, paymentDateStr?: string | null) => {
  const start = new Date(invoiceDateStr);
  const end = paymentDateStr ? new Date(paymentDateStr) : new Date();
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const getFrenchMonth = (dateStr: string) => {
  const date = new Date(dateStr);
  const months = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
  return months[date.getMonth()];
};

const formatDateFr = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const getExpectedPaymentDate = (invoiceDateStr: string, conventionStr?: string, paymentDelayStr?: string) => {
  if (!invoiceDateStr) return "";
  const date = new Date(invoiceDateStr);
  if (isNaN(date.getTime())) return "";

  let days = 0;
  if (conventionStr) {
    const match = conventionStr.match(/\d+/);
    if (match) {
      days = parseInt(match[0], 10);
    }
  }
  if (days === 0 && paymentDelayStr) {
    const match = paymentDelayStr.match(/\d+/);
    if (match) {
      days = parseInt(match[0], 10);
    }
  }

  const expectedDate = new Date(date.getTime());
  expectedDate.setDate(expectedDate.getDate() + days);

  const year = expectedDate.getFullYear();
  const month = String(expectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(expectedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function Instances() {
  const { instances, deleteInstance, addInstance, updateInstance } = useApp();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editInstance, setEditInstance] = useState<Instance | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("pending");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "alphabetical" | "delay" | "convention" | "expectedDate" | "mdp">("date");
  const [delayFilter, setDelayFilter] = useState<string>("all");
  const [conventionFilter, setConventionFilter] = useState<string>("all");
  const [mdpFilter, setMdpFilter] = useState<string>("all");

  // Add states for NewCheckModal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPrefillData, setPaymentPrefillData] = useState<{
    facture: string;
    partnerName: string;
    amount: number;
    type: "Chèque" | "Effet";
    instanceId?: number;
  } | null>(null);

  const uniqueDelays = Array.from(new Set(instances.map(i => i.paymentDelay).filter(Boolean)));
  const uniqueConventions = Array.from(new Set(instances.map(i => i.convention).filter(Boolean)));
  const uniqueMdps = Array.from(new Set(instances.map(i => i.mdp).filter(Boolean)));

  const filteredInstances = instances.filter(inst => {
    // Status Filter
    if (statusFilter === "pending" && inst.paymentDate) return false;
    if (statusFilter === "paid" && !inst.paymentDate) return false;
    
    // New Filters
    if (delayFilter !== "all" && inst.paymentDelay !== delayFilter) return false;
    if (conventionFilter !== "all" && inst.convention !== conventionFilter) return false;
    if (mdpFilter !== "all" && inst.mdp !== mdpFilter) return false;

    // Search query
    const matchesSearch = inst.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inst.facture.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date range filter (Invoice Date)
    if (startDate || endDate) {
      const instDate = new Date(inst.date);
      if (startDate && instDate < startDate) return false;
      if (endDate && instDate > endDate) return false;
    }

    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "alphabetical") {
      return a.partnerName.localeCompare(b.partnerName);
    }
    if (sortBy === "delay") {
      return (a.paymentDelay || "").localeCompare(b.paymentDelay || "");
    }
    if (sortBy === "convention") {
      return (a.convention || "").localeCompare(b.convention || "");
    }
    if (sortBy === "expectedDate") {
      const dateA = getExpectedPaymentDate(a.date, a.convention, a.paymentDelay);
      const dateB = getExpectedPaymentDate(b.date, b.convention, b.paymentDelay);
      return dateA.localeCompare(dateB);
    }
    if (sortBy === "mdp") {
      return (a.mdp || "").localeCompare(b.mdp || "");
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Statistics
  const pendingInvoices = instances.filter(i => !i.paymentDate);
  const paidInvoices = instances.filter(i => !!i.paymentDate);

  const totalPendingAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaidAmount = paidInvoices.reduce((s, i) => s + i.amount, 0);
  const totalGeneralAmount = instances.reduce((s, i) => s + i.amount, 0);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedInstanceIds(filteredInstances.map(i => i.id));
    } else {
      setSelectedInstanceIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedInstanceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getInstancesToExport = () => {
    if (selectedInstanceIds.length > 0) {
      return filteredInstances.filter(i => selectedInstanceIds.includes(i.id));
    }
    return filteredInstances;
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedInstanceIds.length} facture(s) en instance ?`)) return;
    
    // Process deletions sequentially or concurrently. Doing it sequentially to avoid overwhelming the server
    for (const id of selectedInstanceIds) {
      try {
        await deleteInstance(id, true);
      } catch (err) {
        console.error("Failed to delete instance", id, err);
      }
    }
    
    setSelectedInstanceIds([]);
  };

  const handleExportCSV = (separator = ',') => {
    const items = getInstancesToExport();
    const headers = ["DATE", "DUREE", "MOIS", "FACTURE", "FOURNISSEUR / BÉNÉFICIAIRE", "MONTANT", "DELAI DE PAIEMENT", "CONVENTION", "DATE PRÉVUE RÈGLEMENT", "MDP", "DATE DE PAIEMENT", "OBSERVATION"];
    
    const rows = items.map(inst => {
      const dur = getDuration(inst.date, inst.paymentDate);
      const mois = getFrenchMonth(inst.date);
      const datePrevue = getExpectedPaymentDate(inst.date, inst.convention, inst.paymentDelay);
      
      return [
        formatDateFr(inst.date),
        `${dur},00`,
        mois,
        inst.facture,
        inst.partnerName,
        inst.amount,
        inst.paymentDelay,
        inst.convention,
        formatDateFr(datePrevue),
        inst.mdp,
        inst.paymentDate ? formatDateFr(inst.paymentDate) : "",
        inst.observation || ""
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(separator);
    });

    const csvContent = "\uFEFF" + [headers.join(separator), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export_factures_instances_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    handleExportCSV(';');
  };

  const handleExportPDF = () => {
    const items = getInstancesToExport();
    const printWindow = window.open('', '', 'width=1100,height=800');
    if (!printWindow) return;

    const tableRows = items.map(inst => {
      const dur = getDuration(inst.date, inst.paymentDate);
      const mois = getFrenchMonth(inst.date);
      const datePrevue = getExpectedPaymentDate(inst.date, inst.convention, inst.paymentDelay);
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px;">${formatDateFr(inst.date)}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${dur},00</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${mois}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${inst.facture}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${inst.partnerName}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatMAD(inst.amount)}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${inst.paymentDelay}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${inst.convention}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${formatDateFr(datePrevue)}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${inst.mdp}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${inst.paymentDate ? formatDateFr(inst.paymentDate) : ""}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${inst.observation || ""}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factures en Instance de Paiement</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th { border: 1px solid #ddd; padding: 8px; background-color: #f1f5f9 !important; text-align: left; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 6px; }
            h1 { font-size: 16px; margin-bottom: 5px; color: #0f172a; }
            p { font-size: 11px; margin: 2px 0; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>FACTURES EN INSTANCE DE PAIEMENT</h1>
          <p>Généré le: ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>DUREE</th>
                <th>MOIS</th>
                <th>FACTURE</th>
                <th>FOURNISSEUR / BÉNÉFICIAIRE</th>
                <th>MONTANT</th>
                <th>DELAI DE PAIEMENT</th>
                <th>CONVENTION</th>
                <th>DATE PRÉVUE RÈGLEMENT</th>
                <th>MDP</th>
                <th>DATE DE PAIEMENT</th>
                <th>OBSERVATION</th>
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
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawDataArrays = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });

        if (rawDataArrays.length === 0) {
          alert("Le fichier Excel est vide.");
          return;
        }

        let headerRowIndex = -1;
        let keys: string[] = [];

        // Find the header row dynamically
        for (let i = 0; i < rawDataArrays.length; i++) {
          const row = rawDataArrays[i].map(cell => String(cell).toLowerCase().replace(/[^a-z0-9]/g, ""));
          
          const hasFacture = row.some(c => c.includes("facture") || c.includes("nfacture") || c.includes("numero"));
          const hasFournisseur = row.some(c => c.includes("fournisseur") || c.includes("partenaire") || c.includes("client") || c.includes("beneficiaire"));
          const hasMontant = row.some(c => c.includes("montant") || c.includes("somme"));

          if (hasFacture && hasFournisseur && hasMontant) {
            headerRowIndex = i;
            keys = rawDataArrays[i].map(cell => String(cell).trim());
            break;
          }
        }

        if (headerRowIndex === -1) {
          alert("Erreur : L'en-tête du tableau est introuvable (les colonnes 'Facture', 'Fournisseur' et 'Montant' sont requises).");
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
        const factureCol = getColumnKey(["facture", "numero", "nfacture", "fac"]);
        const partnerCol = getColumnKey(["fournisseur", "partenaire", "client", "nom", "partner", "beneficiaire"]);
        const amountCol = getColumnKey(["montant", "somme", "valeur", "amount"]);
        const delayCol = getColumnKey(["delai", "paymentdelay", "delaipaiement", "echeance"]);
        const conventionCol = getColumnKey(["convention", "accord"]);
        const mdpCol = getColumnKey(["mdp", "modedepaiement", "modepaiement", "mode de paiement"]);
        const paymentDateCol = getColumnKey(["datepaiement", "paymentdate", "paye", "reglementdate"]);
        const obsCol = getColumnKey(["observation", "obs", "note", "commentaire"]);

        // Validate critical fields
        if (!factureCol || !partnerCol || !amountCol) {
          alert("Erreur de format : Les colonnes 'Facture', 'Fournisseur' et 'Montant' sont requises.");
          return;
        }

        let importedCount = 0;
        
        for (const row of rawData) {
          // Parse date
          let dateVal = "";
          const rawDate = row[dateCol];
          if (rawDate) {
            if (rawDate instanceof Date) {
              dateVal = rawDate.toISOString().split("T")[0];
            } else {
              // try parsing string like DD/MM/YYYY or YYYY-MM-DD
              const strDate = String(rawDate).trim();
              const parts = strDate.split("/");
              if (parts.length === 3) {
                dateVal = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              } else {
                const partsDash = strDate.split("-");
                if (partsDash.length === 3) {
                  dateVal = strDate;
                } else {
                  dateVal = new Date().toISOString().split("T")[0];
                }
              }
            }
          } else {
            dateVal = new Date().toISOString().split("T")[0];
          }

          // Parse payment date if exists
          let paymentDateVal = null;
          const rawPaymentDate = row[paymentDateCol];
          if (rawPaymentDate) {
            if (rawPaymentDate instanceof Date) {
              paymentDateVal = rawPaymentDate.toISOString().split("T")[0];
            } else {
              const strDate = String(rawPaymentDate).trim();
              const parts = strDate.split("/");
              if (parts.length === 3) {
                paymentDateVal = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              } else {
                const partsDash = strDate.split("-");
                if (partsDash.length === 3) {
                  paymentDateVal = strDate;
                }
              }
            }
          }

          // Parse amount
          let rawAmount = String(row[amountCol]).trim();
          // Remove all spaces (often used as thousands separators in French formatting)
          rawAmount = rawAmount.replace(/\s/g, "");
          // If there is a comma, we treat it as the decimal separator.
          // Example: "7 512,00" -> "7512,00" -> "7512.00"
          // "2.054.400,00" -> "2054400.00"
          if (rawAmount.includes(",")) {
            // Remove any dots that might be used as thousands separators
            rawAmount = rawAmount.replace(/\./g, "");
            // Replace the comma with a dot for parseFloat
            rawAmount = rawAmount.replace(",", ".");
          }
          let amountVal = parseFloat(rawAmount.replace(/[^0-9.-]/g, ""));
          
          if (isNaN(amountVal)) {
            continue; // skip rows with invalid amount
          }

          const factureVal = String(row[factureCol] || "").trim();
          const partnerVal = String(row[partnerCol] || "").trim();

          if (!factureVal || !partnerVal) {
            continue; // skip rows without required fields
          }

          const delayVal = String(row[delayCol] || "30 jours").trim();
          const conventionVal = String(row[conventionCol] || "Standard").trim();
          const mdpVal = String(row[mdpCol] || "Chèque").trim();
          const obsVal = String(row[obsCol] || "").trim();

          await addInstance({
            date: dateVal,
            facture: factureVal,
            partnerName: partnerVal,
            amount: amountVal,
            paymentDelay: delayVal,
            convention: conventionVal,
            mdp: mdpVal,
            paymentDate: paymentDateVal,
            observation: obsVal || null,
          });

          importedCount++;
        }

        alert(`${importedCount} factures importées avec succès.`);
        // Reset file input
        e.target.value = "";
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const openNewModal = () => {
    setEditInstance(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inst: Instance) => {
    setEditInstance(inst);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] mb-1 font-bold text-slate-900 tracking-tight">Factures en Instance</h1>
          <div className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
            <span>Tableau de Bord</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>Instances</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <label htmlFor="excel-import-input" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-[8px] text-[12px] font-bold transition flex items-center gap-2 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" /> Importer Excel
          </label>
          <input 
            type="file" 
            id="excel-import-input" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleImportExcelFile} 
            className="hidden" 
          />
          <button 
            onClick={openNewModal}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-[8px] text-[12px] font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouvelle Facture
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-orange-100 bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Total en Instance</span>
            <span className="text-[11px] font-medium text-slate-500">{pendingInvoices.length} Factures</span>
            <span className="text-[16px] font-bold text-slate-900 mt-0.5">{formatMAD(totalPendingAmount)}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-green-100 bg-green-50 text-green-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Total Réglé</span>
            <span className="text-[11px] font-medium text-slate-500">{paidInvoices.length} Factures</span>
            <span className="text-[16px] font-bold text-slate-900 mt-0.5">{formatMAD(totalPaidAmount)}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[2px] border-slate-100 bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
            <Share className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Total Général</span>
            <span className="text-[11px] font-medium text-slate-500">{instances.length} Factures</span>
            <span className="text-[16px] font-bold text-slate-900 mt-0.5">{formatMAD(totalGeneralAmount)}</span>
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
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Statut</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="all">Tous</option>
                <option value="pending">En Instance</option>
                <option value="paid">Payée</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-[120px] max-w-[150px]">
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Délai</span>
              <select 
                value={delayFilter}
                onChange={(e) => setDelayFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="all">Tous</option>
                {uniqueDelays.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-[120px] max-w-[150px]">
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Convention</span>
              <select 
                value={conventionFilter}
                onChange={(e) => setConventionFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="all">Toutes</option>
                {uniqueConventions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-[120px] max-w-[150px]">
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Paiement</span>
              <select 
                value={mdpFilter}
                onChange={(e) => setMdpFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="all">Tous</option>
                {uniqueMdps.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 max-w-[200px]">
              <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">Trier par</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-[6px] text-[12px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent"
              >
                <option value="date">Date de facture</option>
                <option value="alphabetical">Ordre alphabétique (A-Z)</option>
                <option value="delay">Délai de paiement</option>
                <option value="convention">Convention</option>
                <option value="expectedDate">Date prévue règlement</option>
                <option value="mdp">Mode de paiement</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-[250px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher Fournisseur/Bénéficiaire, N° Facture.."
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

            {selectedInstanceIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-[6px] text-[12px] font-semibold hover:bg-red-600 transition shadow-sm border-none cursor-pointer"
                title="Supprimer la sélection"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Supprimer ({selectedInstanceIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap table-fixed min-w-[1350px]">
            <thead className="bg-[#F8FAFC] border-y border-slate-200">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredInstances.length > 0 && filteredInstances.every(i => selectedInstanceIds.includes(i.id))}
                    onChange={handleSelectAll}
                    className="rounded-[4px] border-slate-300 w-4 h-4 cursor-pointer accent-primary" 
                  />
                </th>
                <th className="px-3 py-4 w-[110px] font-bold text-slate-600 text-[11px] tracking-wide">Action</th>
                <th className="px-3 py-4 w-[110px] font-bold text-slate-600 text-[11px] tracking-wide">DATE</th>
                <th className="px-3 py-4 w-[85px] font-bold text-slate-600 text-[11px] tracking-wide text-right">DUREE</th>
                <th className="px-3 py-4 w-[95px] font-bold text-slate-600 text-[11px] tracking-wide">MOIS</th>
                <th className="px-3 py-4 w-[115px] font-bold text-slate-600 text-[11px] tracking-wide">FACTURE</th>
                <th className="px-3 py-4 w-[200px] font-bold text-slate-600 text-[11px] tracking-wide">FOURNISSEUR / BÉNÉFICIAIRE</th>
                <th className="px-3 py-4 w-[125px] font-bold text-slate-600 text-[11px] tracking-wide text-right">MONTANT</th>
                <th className="px-3 py-4 w-[150px] font-bold text-slate-600 text-[11px] tracking-wide">DELAI DE PAIEMENT</th>
                <th className="px-3 py-4 w-[120px] font-bold text-slate-600 text-[11px] tracking-wide">CONVENTION</th>
                <th className="px-3 py-4 w-[160px] font-bold text-slate-600 text-[11px] tracking-wide">DATE PRÉVUE RÈGLEMENT</th>
                <th className="px-3 py-4 w-[75px] font-bold text-slate-600 text-[11px] tracking-wide text-center">MDP</th>
                <th className="px-3 py-4 w-[140px] font-bold text-slate-600 text-[11px] tracking-wide">DATE DE PAIEMENT</th>
                <th className="px-3 py-4 w-[160px] font-bold text-slate-600 text-[11px] tracking-wide">OBSERVATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInstances.map((inst) => {
                const duration = getDuration(inst.date, inst.paymentDate);
                const mois = getFrenchMonth(inst.date);

                let isNearDeadline = false;
                if (!inst.paymentDate) {
                  const daysDelay = parseInt(inst.paymentDelay) || 0;
                  const due = new Date(inst.date);
                  due.setDate(due.getDate() + daysDelay);
                  due.setHours(0, 0, 0, 0);
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const diffTime = due.getTime() - today.getTime();
                  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (remainingDays <= 7) {
                    isNearDeadline = true;
                  }
                }

                return (
                  <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedInstanceIds.includes(inst.id)}
                        onChange={() => handleSelectOne(inst.id)}
                        className="rounded-[4px] border-slate-300 w-4 h-4 cursor-pointer accent-primary" 
                      />
                    </td>
                    <td className="px-3 py-4 w-[110px]">
                      <div className="flex items-center gap-3">
                        <span title="Modifier la facture">
                          <Pencil
                            onClick={() => openEditModal(inst)}
                            className="w-4 h-4 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
                          />
                        </span>
                        <span title="Supprimer la facture">
                          <Trash2
                            onClick={() => deleteInstance(inst.id)}
                            className="w-4 h-4 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                          />
                        </span>
                        {!inst.paymentDate && (
                          <span title="Payer cette facture">
                            <CreditCard
                              onClick={async () => {
                                const today = new Date().toISOString().split("T")[0];
                                await updateInstance(inst.id, { ...inst, paymentDate: today });
                              }}
                              className="w-4 h-4 text-slate-400 hover:text-green-600 cursor-pointer transition-colors"
                            />
                          </span>
                        )}
                        {inst.mdp !== "Virement" && (
                          <span title="Imprimer (Chèque/Effet)">
                            <Printer
                              onClick={() => {
                                const printState = {
                                  bankType: inst.mdp === "Effet" ? "BANQUE POPULAIRE - Effet" : "BANQUE POPULAIRE - Chèque",
                                  amount: inst.amount.toString(),
                                  payee: inst.partnerName,
                                  date: formatDateFr(inst.date),
                                  dueDate: formatDateFr(inst.date),
                                  cause: inst.facture,
                                  type: inst.mdp === "Effet" ? "Effet" : "Chèque",
                                  source: "instance"
                                };
                                localStorage.setItem("printData", JSON.stringify(printState));
                                window.open("/impression", "_blank");
                              }}
                              className="w-4 h-4 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 w-[110px] font-medium text-slate-700">
                      {formatDateFr(inst.date)}
                    </td>
                    <td className={`px-3 py-4 w-[85px] text-right font-bold ${isNearDeadline ? 'text-red-600' : 'text-slate-600'}`}>
                      {duration},00
                    </td>
                    <td className="px-3 py-4 w-[95px] font-medium text-slate-500 uppercase">
                      {mois}
                    </td>
                    <td className="px-3 py-4 w-[115px] font-bold text-slate-800">
                      {inst.facture}
                    </td>
                    <td className="px-3 py-4 w-[200px] font-bold text-slate-900 truncate" title={inst.partnerName}>
                      {inst.partnerName}
                    </td>
                    <td className="px-3 py-4 w-[125px] text-right font-bold text-slate-950">
                      {formatMAD(inst.amount)}
                    </td>
                    <td className="px-3 py-4 w-[150px] text-slate-600 font-medium">
                      {inst.paymentDelay}
                    </td>
                    <td className="px-3 py-4 w-[120px] text-slate-600 font-medium">
                      {inst.convention}
                    </td>
                    <td className="px-3 py-4 w-[160px] font-semibold text-slate-700">
                      {formatDateFr(getExpectedPaymentDate(inst.date, inst.convention, inst.paymentDelay))}
                    </td>
                    <td className="px-3 py-4 w-[75px] text-center font-bold text-slate-700 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100">
                      {inst.mdp}
                    </td>
                    <td className="px-3 py-4 w-[140px] font-medium text-slate-600">
                      {inst.paymentDate ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-[4px] font-bold text-[10px]">
                          {formatDateFr(inst.paymentDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">En attente</span>
                      )}
                    </td>
                    <td className="px-3 py-4 w-[160px] text-slate-500 truncate" title={inst.observation || ""}>
                      {inst.observation || "-"}
                    </td>
                  </tr>
                );
              })}
              {filteredInstances.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                    Aucune facture en instance trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewInstanceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editInstance={editInstance}
      />

      <NewCheckModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentPrefillData(null);
        }}
        prefillData={paymentPrefillData}
      />
    </div>
  );
}
