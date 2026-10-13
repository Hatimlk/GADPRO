import { getBankLogo } from "@/lib/utils";
import { useApp, COMPANY_NAME } from "@/lib/AppContext";
import { BankAccount } from "@/lib/types";
import { Plus, User, Info, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { NewAccountModal } from "@/components/NewAccountModal";


export function BankAccounts() {
  const { bankAccounts, deleteBankAccount } = useApp();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);



  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[18px] mb-0 font-bold text-slate-900 tracking-tight">Comptes Bancaires</h1>
          <p className="text-[12px] text-slate-500 m-0">Gérez vos comptes bancaires et carnets.</p>
        </div>

      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFA000] text-white flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-[14px] uppercase m-0 leading-tight">{COMPANY_NAME}</h3>
              <div className="inline-flex items-center gap-1 bg-[#E1F0FF] text-[#0066FF] text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase mt-1">
                ADMINISTRATEUR <Info className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-[6px] text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition bg-white cursor-pointer add-account-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un Nouveau RIB
            </button>
          </div>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">Aucun compte bancaire trouvé.</p>
            <button onClick={() => setIsAccountModalOpen(true)} className="mt-3 text-[13px] font-semibold text-primary hover:opacity-80 bg-transparent border-none cursor-pointer">
              Ajouter un compte
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] whitespace-nowrap border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100">Banque</th>
                  <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankAccounts.map(account => {
                  const logoPath = getBankLogo(account.bankName);

                  return (
                    <tr key={account.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm border border-slate-100">
                            {logoPath ? (
                              <img src={logoPath} alt={account.bankName} className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-[#FF5B37]"></div>
                                <svg className="absolute w-full h-full text-black/80" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <path d="M0,50 L20,30 L40,60 L60,30 L80,60 L100,40 L100,100 L0,100 Z" fill="currentColor"/>
                                </svg>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-[13px] uppercase leading-tight">{account.bankName}</span>
                            <span className="text-[12px] font-medium text-slate-400">{account.rib}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setAccountToEdit(account); setIsAccountModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteBankAccount(account.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 flex items-center justify-between text-[11px] text-slate-500 bg-white border-t border-slate-100">
          <div>Affichage de 1 à {bankAccounts.length} sur {bankAccounts.length} entrées</div>
        </div>
      </div>

      <NewAccountModal isOpen={isAccountModalOpen} onClose={() => { setIsAccountModalOpen(false); setAccountToEdit(null); }} editAccount={accountToEdit} />
    </div>
  );
}
