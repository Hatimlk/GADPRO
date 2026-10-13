import { useState, useRef } from "react";
import { Search, Plus, Users, Briefcase, Edit2, Trash2, Upload, ArrowUpDown } from "lucide-react";
import * as XLSX from "xlsx";
import { useApp, PartnerListItem, PartnerType } from "@/lib/AppContext";
import { NewPartnerModal } from "@/components/NewPartnerModal";

export function Partners() {
  const { partnerList, addPartnerListItem, updatePartnerListItem, deletePartnerListItem, addMultiplePartnerListItems, deleteMultiplePartnerListItems } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<PartnerListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPartners = partnerList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.contact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    if (sortOrder === "asc") {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  const handleSavePartner = (data: Omit<PartnerListItem, "id">) => {
    if (partnerToEdit) {
      updatePartnerListItem(partnerToEdit.id, data);
    } else {
      addPartnerListItem(data);
    }
    setPartnerToEdit(null);
  };

  const handleEdit = (partner: PartnerListItem) => {
    setPartnerToEdit(partner);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deletePartnerListItem(id);
  };

  const openNewPartnerModal = () => {
    setPartnerToEdit(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        console.log("Données Excel brutes (première ligne) :", data[0]);

        const newPartners: Omit<PartnerListItem, "id">[] = data.map((row) => {
          const normalizedRow: Record<string, any> = {};
          for (const key in row) {
            const cleanKey = key.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
            normalizedRow[cleanKey] = row[key];
          }

          const getVal = (...keys: string[]) => {
             for (const k of keys) {
               if (normalizedRow[k] !== undefined && normalizedRow[k] !== null) {
                 return String(normalizedRow[k]);
               }
             }
             return "";
          };

          const nom = getVal('raison social/nom', 'raison social / nom', 'nom', 'name', 'partenaire', 'client', 'fournisseur');
          const banque = getVal('banque', 'bank');
          const agence = getVal('agence', 'agency');
          const contactStr = banque + (agence ? ` - ${agence}` : "");
          const compte = getVal('num de compte', 'numéro de compte', 'compte', 'num compte', 'n° de compte', 'n° compte');
          const convention = getVal('convention');
          const typeVal = getVal('type').toLowerCase();

          return {
            name: nom,
            type: (typeVal === "fournisseur" ? "Fournisseur" : "Fournisseur") as PartnerType, // Defaulting to Fournisseur as requested for these lists typically
            contact: contactStr || getVal('contact', 'coordonnées'),
            phone: compte || getVal('phone', 'téléphone'),
            convention: convention,
            balance: Number(getVal('solde', 'balance')) || 0,
          };
        }).filter(p => p.name.trim() !== "");

        if (newPartners.length > 0) {
          await addMultiplePartnerListItems(newPartners);
        }
      } catch (error) {
        console.error("Erreur lors de l'importation:", error);
        alert("Erreur lors de la lecture du fichier Excel.");
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkDelete = async () => {
    await deleteMultiplePartnerListItems(selectedIds);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPartners.length && filteredPartners.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPartners.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[18px] mb-0 font-bold text-slate-900 tracking-tight">Partenaires</h1>
          <p className="text-[12px] text-slate-500 m-0">Gérez vos clients et fournisseurs.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-[6px] text-[12px] font-semibold hover:opacity-90 transition shadow-sm border-none cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer ({selectedIds.length})
            </button>
          )}
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold hover:bg-slate-200 transition shadow-sm border border-slate-200 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Importer Excel
          </button>
          <button onClick={openNewPartnerModal} className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-[6px] text-[12px] font-semibold hover:opacity-90 transition shadow-sm border-none cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Nouveau Partenaire
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-end gap-4">

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom..."
                className="w-full sm:w-[250px] pl-9 pr-4 py-1.5 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 border-b-2 border-slate-100 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                    checked={filteredPartners.length > 0 && selectedIds.length === filteredPartners.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th 
                  className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100 cursor-pointer hover:bg-slate-50 group transition-colors"
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                >
                  <div className="flex items-center gap-1">
                    Nom du Partenaire
                    <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100">Coordonnées Bancaires</th>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100">Convention</th>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner) => (
                <tr key={partner.id} className={`hover:bg-slate-50 border-b border-slate-50 ${selectedIds.includes(partner.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                      checked={selectedIds.includes(partner.id)}
                      onChange={() => toggleSelectOne(partner.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-900">{partner.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-medium">{partner.contact}</span>
                      <span className="text-[11px] font-mono text-slate-500">{partner.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-700 text-[12px] font-medium">{partner.convention || "-"}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(partner)} title="Modifier" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(partner.id)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 border-b border-slate-50">
                    Aucun partenaire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between text-[11px] text-slate-500 bg-white border-t border-slate-100">
          <div>Affichage de 1 à {filteredPartners.length} sur {filteredPartners.length} entrées</div>
        </div>
      </div>

      <NewPartnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePartner}
        editPartner={partnerToEdit}
      />
    </div>
  );
}
