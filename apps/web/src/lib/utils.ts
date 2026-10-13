import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMAD(amount: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "En Circulation":
      return "bg-[#FEF3C7] text-[#D97706]";
    case "En Retard":
      return "bg-[#FEE2E2] text-[#DC2626]";
    case "Déposé":
      return "bg-blue-100 text-blue-700";
    case "Impayé":
      return "bg-orange-100 text-orange-700";
    case "Payé":
      return "bg-[#D1FAE5] text-[#059669]";
    case "Annulé":
      return "bg-[#F3F4F6] text-[#4B5563]";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export const getStatusChartColor = (status: string) => {
  switch (status) {
    case "En Circulation": return "#FBBF24";
    case "En Retard": return "#EF4444";
    case "Déposé": return "#3B82F6";
    case "Impayé": return "#F97316";
    case "Payé": return "#10B981";
    case "Annulé": return "#9CA3AF";
    default: return "#9CA3AF";
  }
};

export const getBankLogo = (bankName: string): string | null => {
  const name = bankName.toLowerCase();
  if (name.includes('attijari') || name.includes('awb')) return '/logos-bank/Attijariwafa Bank.png';
  if (name.includes('africa') || name.includes('boa')) return '/logos-bank/Bank Of Africa.png';
  if (name.includes('populaire') || name.includes('bp') || name.includes('banque pop')) return '/logos-bank/Bp.jpeg';
  if (name.includes('saham')) return '/logos-bank/Saham Bank.png';
  if (name.includes('barid')) return '/logos-bank/baridbank.png';
  if (name.includes('bmci')) return '/logos-bank/bmci.jpeg';
  if (name.includes('cdm') || name.includes('crédit du maroc') || name.includes('credit du maroc')) return '/logos-bank/cdm.png';
  if (name.includes('agricole') || name.includes('cam')) return '/logos-bank/creditagricole.png';
  return null;
};
