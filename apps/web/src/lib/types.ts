export type Company = {
  id: string;
  name: string;
  logoUrl?: string;
};

export type BankAccount = {
  id: string;
  companyId: string;
  bankName: string;
  rib: string;
  checkbooksCount: number;
  totals: {
    nonPaid: number;
    paid: number;
    cancelled: number;
  };
};

export type CheckStatus = "En Circulation" | "En Retard" | "Déposé" | "Impayé" | "Payé" | "Annulé";
export type CheckType = "Chèque" | "Effet";

export type Check = {
  id: string;
  bankAccountId: string;
  checkbookId?: string;
  type: CheckType;
  number: string;
  partnerId: string;
  partnerName: string;
  emissionDate: string;
  dueDate: string;
  amount: number;
  status: CheckStatus;
  note?: string;
  facture?: string;
};

export type Checkbook = {
  id: string;
  bankAccountId: string;
  bankName: string;
  type: CheckType;
  creationDate: string;
  startNumber: string;
  endNumber: string;
  remaining: number;
  totals: {
    nonPaid: number;
    paid: number;
    cancelled: number;
  };
};

export type Instance = {
  id: number;
  date: string;
  facture: string;
  partnerId?: string | null;
  partnerName: string;
  amount: number;
  paymentDelay: string;
  convention: string;
  mdp: string;
  paymentDate?: string | null;
  observation?: string | null;
};

export type Notification = {
  id: string;
  type: "due_soon" | "overdue";
  checkId: string;
  dueDate: string;
  amount: number;
  partnerName: string;
  facture?: string;
  source?: "check" | "instance";
};
