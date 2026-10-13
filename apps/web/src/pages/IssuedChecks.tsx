import { useState } from "react";
import { formatMAD, cn, getBankLogo } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";
import { Check, CheckStatus } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Printer, Pencil, Eye,
  FileText, RefreshCw, Bell, FileCheck, FileX,
  ChevronDown, Send, Calendar, Download, FileUp, Filter,
  Check as CheckIcon, X, Share, Trash2
} from "lucide-react";
import { NewCheckModal } from "@/components/NewCheckModal";
import { ViewCheckModal } from "@/components/ViewCheckModal";
import { DatePicker } from "@/components/DatePicker";

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

const getEcheanceBadge = (dueDate: string, status: string) => {
  if (status === "Payé") {
    return <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-bold"><FileCheck className="w-3 h-3" /> Payé</span>;
  }
  if (status === "Annulé") {
    return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">Annulé</span>;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold"><Bell className="w-3 h-3" /> {Math.abs(diff)}j retard</span>;
  }
  if (diff === 0) {
    return <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold"><Bell className="w-3 h-3" /> Aujourd'hui</span>;
  }
  const months = Math.floor(diff / 30);
  const days = diff % 30;
  const label = months > 0 ? `${months}m ${days}j` : `+${diff}j`;
  return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold"><RefreshCw className="w-3 h-3" /> {label}</span>;
};

export function IssuedChecks() {
  const { checks, bankAccounts, updateCheckStatus, deleteCheck } = useApp();
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<string>("Tous");
  const [isNewCheckModalOpen, setIsNewCheckModalOpen] = useState(false);
  const [checkToView, setCheckToView] = useState<Check | null>(null);
  const [checkToEdit, setCheckToEdit] = useState<Check | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("status");
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("Tous");

  const emittedChecks = checks.filter(c => c.status !== "Payé");

  const checksEnCirculation = emittedChecks.filter(c => c.status === "En Circulation");
  const checksEnRetard = emittedChecks.filter(c => c.status === "En Retard");
  const checksAnnule = emittedChecks.filter(c => c.status === "Annulé");

  const filteredChecks = emittedChecks.filter(c => {
    const matchesStatus = activeStatus === "Tous" || c.status === activeStatus;
    const matchesType = typeFilter === "Tous" || c.type === typeFilter;
    const matchesSearch = c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "status") {
      const weight: Record<string, number> = { "En Retard": 0, "En Circulation": 1, "Déposé": 2, "Impayé": 3, "Payé": 4, "Annulé": 5 };
      return (weight[a.status] ?? 99) - (weight[b.status] ?? 99);
    } else if (sortBy === "date") {
      return new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime();
    } else if (sortBy === "code") {
      return a.number.localeCompare(b.number);
    }
    return 0;
  });

  const totalEmitted = emittedChecks.reduce((s, c) => s + c.amount, 0);
  const totalEnCirculation = checksEnCirculation.reduce((s, c) => s + c.amount, 0);
  const totalEnRetard = checksEnRetard.reduce((s, c) => s + c.amount, 0);
  const totalAnnule = checksAnnule.reduce((s, c) => s + c.amount, 0);

  const statusOptions: CheckStatus[] = ["En Circulation", "En Retard", "Déposé", "Impayé", "Payé", "Annulé"];

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

  const handleDeposer = (check: Check) => {
    if (check.status === "En Circulation" || check.status === "En Retard") {
      updateCheckStatus(check.id, "Déposé");
    }
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

  const getChecksToExport = () => {
    if (selectedCheckIds.length > 0) {
      return filteredChecks.filter(c => selectedCheckIds.includes(c.id));
    }
    return filteredChecks;
  };

  const handleExportCSV = (separator = ',') => {
    const checksToExport = getChecksToExport();
    const headers = ["Compte Bancaire", "Type", "Numéro", "Fournisseur / Bénéficiaire", "Date d'Émission", "Date d'Échéance", "Montant", "Facture", "Statut", "Note"];
    
    const rows = checksToExport.map(check => {
      const account = bankAccounts.find(a => a.id === check.bankAccountId);
      const bankName = account?.bankName || "Inconnu";
      
      return [
        bankName,
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
    link.setAttribute("download", `export_cheques_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    // For french locales, Excel uses semicolon as delimiter by default for CSV
    handleExportCSV(';');
  };

  const handleExportPDF = () => {
    const checksToExport = getChecksToExport();
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;

    const tableRows = checksToExport.map(check => {
      const account = bankAccounts.find(a => a.id === check.bankAccountId);
      const bankName = account?.bankName || "Inconnu";
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${bankName}</td>
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
          <title>Export Chèques</title>
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
          <h1>Liste des Chèques/Effets Émis</h1>
          <p>Généré le: ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>Compte Bancaire</th>
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] mb-1 font-bold text-slate-900 tracking-tight">Chèques/Effets Émis</h1>
          <div className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
            <span>Tableau de Bord</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>Chèques/Effets Émis</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsNewCheckModalOpen(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition shadow-sm border-none cursor-pointer">
            <Plus className="w-4 h-4" />
            Nouveau Valeur Émis
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch overflow-hidden">
        <div className="flex-1 flex items-center gap-4 px-6 py-5 border-b md:border-b-0 md:border-r border-slate-100 min-w-[200px]">
          <div className="w-12 h-12 rounded-full border-[2px] border-cyan-100 bg-cyan-50 text-cyan-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Total Émis</span>
            <span className="text-[11px] font-medium text-slate-500">{emittedChecks.length} Valeurs</span>
            <span className="text-[14px] font-bold text-slate-900 mt-0.5">{formatMAD(totalEmitted).replace('MAD', '').trim()} MAD</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-4 px-6 py-5 border-b md:border-b-0 md:border-r border-slate-100 min-w-[200px]">
          <div className="w-12 h-12 rounded-full border-[2px] border-orange-100 bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">En Circulation</span>
            <span className="text-[11px] font-medium text-slate-500">{checksEnCirculation.length} Valeurs</span>
            <span className="text-[14px] font-bold text-slate-900 mt-0.5">{formatMAD(totalEnCirculation).replace('MAD', '').trim()} MAD</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-4 px-6 py-5 border-b md:border-b-0 md:border-r border-slate-100 min-w-[200px]">
          <div className="w-12 h-12 rounded-full border-[2px] border-red-100 bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">En Retard</span>
            <span className="text-[11px] font-medium text-slate-500">{checksEnRetard.length} Valeurs</span>
            <span className="text-[14px] font-bold text-slate-900 mt-0.5">{formatMAD(totalEnRetard).replace('MAD', '').trim()} MAD</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-4 px-6 py-5 min-w-[200px]">
          <div className="w-12 h-12 rounded-full border-[2px] border-slate-200 bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <FileX className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800">Annulé</span>
            <span className="text-[11px] font-medium text-slate-500">{checksAnnule.length} Valeurs</span>
            <span className="text-[14px] font-bold text-slate-900 mt-0.5">{formatMAD(totalAnnule).replace('MAD', '').trim()} MAD</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="px-6 flex items-center gap-6 border-b border-slate-100 bg-white pt-2">
          {["Tous", "En Circulation", "En Retard", "Annulé"].map(status => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`pb-3 pt-2 text-[13px] font-bold transition-all duration-200 border-none cursor-pointer border-b-[3px] bg-transparent flex items-center gap-2 ${
                activeStatus === status ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {status}
              <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-bold ${
                status === "Tous" ? "bg-slate-900 text-white" :
                status === "En Circulation" ? "bg-orange-100 text-orange-700" :
                status === "En Retard" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {status === "Tous" ? emittedChecks.length :
                 status === "En Circulation" ? checksEnCirculation.length :
                 status === "En Retard" ? checksEnRetard.length :
                 checksAnnule.length}
              </span>
            </button>
          ))}
        </div>

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
                <option value="status">Statut (retard d'abord)</option>
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
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Compte Bancaire</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Type/Numéro</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Fournisseur/Bénéficiaire / Date d'Émission</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Date d'Échéance</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Montant/Facture</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[11px] tracking-wide">Statut/Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChecks.map((check) => {
                const account = bankAccounts.find(a => a.id === check.bankAccountId);
                const bankName = account?.bankName || "Inconnu";
                const rib = account?.rib || "";
                const logoPath = getBankLogo(bankName);
                const canDeposer = check.status === "En Circulation" || check.status === "En Retard";

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
                                
                                {check.status !== 'Payé' && (
                                  <button onClick={() => { updateCheckStatus(check.id, 'Payé'); setActionMenuOpenId(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors w-full text-left border-none bg-transparent cursor-pointer relative z-10">
                                    <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                      <CheckIcon className="w-2.5 h-2.5" strokeWidth={3} />
                                    </div>
                                    <span className="text-green-500 text-[11px] font-bold">Payé</span>
                                  </button>
                                )}
                                
                                {check.status !== 'En Circulation' && (
                                  <button onClick={() => { updateCheckStatus(check.id, 'En Circulation'); setActionMenuOpenId(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors w-full text-left border-none bg-transparent cursor-pointer relative z-10">
                                    <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                                      <RefreshCw className="w-2.5 h-2.5" strokeWidth={3} />
                                    </div>
                                    <span className="text-orange-500 text-[11px] font-bold">En Circulation</span>
                                  </button>
                                )}

                                {check.status !== 'Annulé' && (
                                  <button onClick={() => { updateCheckStatus(check.id, 'Annulé'); setActionMenuOpenId(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors w-full text-left border-none bg-transparent cursor-pointer relative z-10">
                                    <div className="w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0">
                                      <X className="w-2.5 h-2.5" strokeWidth={3} />
                                    </div>
                                    <span className="text-slate-500 text-[11px] font-bold">Annulé</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <span title="Voir détails">
                          <Eye
                            onClick={() => setCheckToView(check)}
                            className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                          />
                        </span>
                        <span title="Imprimer">
                          <Printer
                            onClick={() => handlePrint(check)}
                            className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                          />
                        </span>
                        <span title="Supprimer">
                          <Trash2
                            onClick={() => deleteCheck(check.id)}
                            className="w-4 h-4 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-100 flex items-center justify-center">
                          {logoPath ? (
                            <img src={logoPath} alt={bankName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#FF5B37]"></div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1E293B] text-[12px] leading-tight uppercase">{bankName}</span>
                          <span className="text-slate-400 font-semibold text-[11px]">{maskRib(rib)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn("px-2 py-0.5 rounded-[4px] text-[10px] font-bold text-white", check.type === 'Effet' ? 'bg-[#FF9800]' : 'bg-[#1E293B]')}>
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
                        {getEcheanceBadge(check.dueDate, check.status)}
                        <span className="text-slate-500 font-medium text-[11px]">{check.dueDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-slate-800 text-[12px]">{formatMAD(check.amount)}</span>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium cursor-pointer">
                          {check.facture ? `Facture : ${check.facture}` : 'service'} <ChevronDown className="w-3 h-3" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end sm:items-start gap-1">
                        <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold inline-block min-w-[90px] text-center",
                          check.status === 'En Retard' ? 'bg-red-50 text-red-600' :
                          check.status === 'En Circulation' ? 'bg-orange-50 text-orange-600' :
                          check.status === 'Payé' ? 'bg-green-50 text-green-600' :
                          check.status === 'Déposé' ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {check.status}
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
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Aucun chèque/effet trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex items-center justify-between text-[11px] text-slate-500 bg-white border-t border-slate-100">
          <div className="flex items-center gap-3">
            {/* Toggle Switch */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
              </div>
              <span className="font-bold text-slate-600">Compact</span>
            </label>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Lignes par page :</span>
              <div className="flex items-center gap-1 font-bold text-slate-800 cursor-pointer">
                25 <ChevronDown className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium text-slate-600">1-4 sur 4</span>
              <div className="flex items-center gap-2">
                <button className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-0">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <button className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-0">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewCheckModal isOpen={isNewCheckModalOpen || !!checkToEdit} onClose={() => { setIsNewCheckModalOpen(false); setCheckToEdit(null); }} editCheck={checkToEdit} />
      <ViewCheckModal check={checkToView} onClose={() => setCheckToView(null)} />
    </div>
  );
}
