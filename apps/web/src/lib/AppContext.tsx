import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { BankAccount, Checkbook, Check, CheckStatus, CheckType, Instance } from "./types";
import { api } from "./api";

export type UserRole = "Administrateur" | "Utilisateur";
export type UserStatus = "Actif" | "Inactif";

export interface User {
  id: number;
  centralId?: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  active?: boolean;
  platformAdmin?: boolean;
  accesses?: Array<{ module: string; role: string; permissions: string[]; dataScope: Record<string, unknown>; legacyUserId?: string }>;
}

export type PartnerType = "Client" | "Fournisseur";

export interface PartnerListItem {
  id: number;
  type: PartnerType;
  name: string;
  contact: string;
  phone: string;
  balance: number;
  convention?: string;
}

export const COMPANY_NAME = "GADIMAT S.A";

interface AppContextType {
  bankAccounts: BankAccount[];
  checkbooks: Checkbook[];
  checks: Check[];
  partnerList: PartnerListItem[];
  instances: Instance[];
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  addBankAccount: (data: { bankName: string; rib: string }) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  updateBankAccount: (id: string, data: { bankName: string; rib: string }) => Promise<void>;
  addCheckbook: (data: { bankAccountId: string; bankName: string; type: CheckType; startNumber: string; endNumber: string }) => Promise<void>;
  deleteCheckbook: (id: string) => Promise<void>;
  addCheck: (data: { bankAccountId: string; checkbookId?: string; type: CheckType; number: string; partnerId: string; partnerName: string; emissionDate: string; dueDate: string; amount: number; facture?: string; note?: string; status?: CheckStatus; instanceIdToDelete?: number }) => Promise<Check>;
  updateCheck: (id: string, data: Partial<Omit<Check, 'id' | 'checkbookId'>>) => Promise<void>;
  updateCheckStatus: (id: string, status: CheckStatus) => Promise<void>;
  deleteCheck: (id: string) => Promise<void>;
  addPartnerListItem: (data: Omit<PartnerListItem, "id">) => Promise<void>;
  updatePartnerListItem: (id: number, data: Partial<PartnerListItem>) => Promise<void>;
  deletePartnerListItem: (id: number) => Promise<void>;
  addInstance: (data: Omit<Instance, "id">) => Promise<void>;
  updateInstance: (id: number, data: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: number, skipConfirm?: boolean) => Promise<void>;
  addUser: (data: Omit<User, "id"> & { password: string }) => Promise<void>;
  updateUser: (id: number, data: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  toggleUserStatus: (id: number) => Promise<void>;
  addMultiplePartnerListItems: (dataArray: Omit<PartnerListItem, "id">[]) => Promise<void>;
  deleteMultiplePartnerListItems: (ids: number[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

async function loadAll(userRole?: UserRole) {
  return Promise.all([
    api.get<BankAccount[]>('/bank-accounts'),
    api.get<Checkbook[]>('/checkbooks'),
    api.get<Check[]>('/checks'),
    api.get<PartnerListItem[]>('/partners'),
    userRole === 'Administrateur' ? api.get<User[]>('/users').catch(() => []) : Promise.resolve([]),
    api.get<Instance[]>('/instances'),
  ]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [checkbooks, setCheckbooks] = useState<Checkbook[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [partnerList, setPartnerList] = useState<PartnerListItem[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const isAuthenticated = currentUser !== null;

  // Restore authentication check and data loading
  useEffect(() => {
    const initialize = async () => {
      try {
          const central = await api.get<any>('/auth/me');
          const access = central.accesses?.find((item: any) => item.module === 'cheques');
          const user: User = { ...central, centralId: central.id, id: Number(access?.legacyUserId || 0), role: (access?.role || 'Utilisateur') as UserRole, status: central.active === false ? 'Inactif' : 'Actif' };
          setCurrentUser(user);
          if (access) {
          const [accounts, books, chks, partners, allUsers, allInstances] = await loadAll(user.role);
          setBankAccounts(accounts);
          setCheckbooks(books);
          setChecks(chks);
          setPartnerList(partners);
          setUsers(allUsers);
          setInstances(allInstances);
          }
        } catch (err) {
          console.error("Authentication failed:", err);
          setCurrentUser(null);
        }
      setInitialized(true);
    };

    initialize();
  }, []);

  // Background sync between Admin and Users without saturating the API.
  useEffect(() => {
    let syncTimeout: number;
    let isSubscribed = true;

    const syncData = async () => {
      if (!isAuthenticated || !currentUser || !currentUser.accesses?.some((access) => access.module === 'cheques')) return;
      try {
        const [accounts, books, chks, partners, allUsers, allInstances] = await loadAll(currentUser.role);
        if (!isSubscribed) return;
        setBankAccounts(accounts);
        setCheckbooks(books);
        setChecks(chks);
        setPartnerList(partners);
        setUsers(allUsers);
        setInstances(allInstances);
      } catch (err) {
        console.error("Sync failed:", err);
      } finally {
        if (isSubscribed) {
          syncTimeout = window.setTimeout(syncData, 60000);
        }
      }
    };

    if (isAuthenticated && currentUser?.accesses?.some((access) => access.module === 'cheques')) {
      syncTimeout = window.setTimeout(syncData, 5000);
    }

    return () => {
      isSubscribed = false;
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [isAuthenticated, currentUser]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      await api.csrf();
      const { user: central } = await api.post<{ user: any }>('/auth/login', { email, password });
      const access = central.accesses?.find((item: any) => item.module === 'cheques');
      const user: User = { ...central, centralId: central.id, id: Number(access?.legacyUserId || 0), role: (access?.role || 'Utilisateur') as UserRole, status: central.active === false ? 'Inactif' : 'Actif' };
      setCurrentUser(user);
      if (access) {
      const [accounts, books, chks, partners, allUsers, allInstances] = await loadAll(user.role);
      setBankAccounts(accounts);
      setCheckbooks(books);
      setChecks(chks);
      setPartnerList(partners);
      setUsers(allUsers);
      setInstances(allInstances);
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Erreur de connexion';
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setCurrentUser(null);
    setBankAccounts([]);
    setCheckbooks([]);
    setChecks([]);
    setPartnerList([]);
    setUsers([]);
    setInstances([]);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const central = await api.get<any>('/auth/me');
    const access = central.accesses?.find((item: any) => item.module === 'cheques');
    setCurrentUser({ ...central, centralId: central.id, id: Number(access?.legacyUserId || 0), role: (access?.role || 'Utilisateur') as UserRole, status: central.active === false ? 'Inactif' : 'Actif' });
  }, []);

  // Bank accounts
  const addBankAccount = useCallback(async (data: { bankName: string; rib: string }) => {
    try {
      const account = await api.post<BankAccount>('/bank-accounts', data);
      setBankAccounts(prev => [...prev, account]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du compte.');
    }
  }, []);

  const deleteBankAccount = useCallback(async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte bancaire ? Tous les carnets et chèques associés seront supprimés.")) return;
    try {
      await api.delete(`/bank-accounts/${id}`);
      setBankAccounts(prev => prev.filter(a => a.id !== id));
      setCheckbooks(prev => prev.filter(cb => cb.bankAccountId !== id));
      setChecks(prev => prev.filter(c => c.bankAccountId !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }, []);

  const updateBankAccount = useCallback(async (id: string, data: { bankName: string; rib: string }) => {
    try {
      await api.put(`/bank-accounts/${id}`, data);
      setBankAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
      setCheckbooks(prev => prev.map(cb => cb.bankAccountId === id ? { ...cb, bankName: data.bankName } : cb));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }, []);

  // Checkbooks
  const addCheckbook = useCallback(async (data: { bankAccountId: string; bankName: string; type: CheckType; startNumber: string; endNumber: string }) => {
    try {
      const book = await api.post<Checkbook>('/checkbooks', data);
      setCheckbooks(prev => [...prev, book]);
      setBankAccounts(prev => prev.map(a =>
        a.id === data.bankAccountId ? { ...a, checkbooksCount: a.checkbooksCount + 1 } : a
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du carnet.');
    }
  }, []);

  const deleteCheckbook = useCallback(async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce carnet ?")) return;
    try {
      const book = checkbooks.find(cb => cb.id === id);
      await api.delete(`/checkbooks/${id}`);
      setCheckbooks(prev => prev.filter(cb => cb.id !== id));
      if (book) {
        setBankAccounts(prev => prev.map(a =>
          a.id === book.bankAccountId ? { ...a, checkbooksCount: Math.max(0, a.checkbooksCount - 1) } : a
        ));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }, [checkbooks]);

  // Checks
  const addCheck = useCallback(async (data: {
    bankAccountId: string; checkbookId?: string; type: CheckType; number: string;
    partnerId: string; partnerName: string; emissionDate: string; dueDate: string;
    amount: number; facture?: string; note?: string; status?: CheckStatus; instanceIdToDelete?: number;
  }) => {
    try {
      const { instanceIdToDelete, ...apiData } = data;
      const check = await api.post<Check>('/checks', apiData);
      setChecks(prev => [check, ...prev]);
      if (apiData.checkbookId) {
        setCheckbooks(prev => prev.map(cb =>
          cb.id === apiData.checkbookId ? { ...cb, remaining: Math.max(0, cb.remaining - 1) } : cb
        ));
      }
      
      if (instanceIdToDelete) {
        await api.delete(`/instances/${instanceIdToDelete}`);
        setInstances(prev => prev.filter(inst => inst.id !== instanceIdToDelete));
      } else if (check.facture) {
        setInstances(insts => insts.map(inst => {
          if (inst.facture === check.facture) {
            const updates: Partial<Instance> = { mdp: check.type };
            if (check.status === 'Payé') {
              updates.paymentDate = check.dueDate;
            }
            api.put(`/instances/${inst.id}`, updates).catch(console.error);
            return { ...inst, ...updates };
          }
          return inst;
        }));
      }
      return check;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du chèque.');
      throw err;
    }
  }, []);

  const updateCheck = useCallback(async (id: string, data: Partial<Omit<Check, 'id' | 'checkbookId'>>) => {
    try {
      const result = await api.put<{ success: boolean; status: CheckStatus }>(`/checks/${id}`, data);
      setChecks(prev => prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...data, status: result.status };
          const finalFacture = updated.facture || c.facture;
          if (finalFacture) {
            setInstances(insts => insts.map(inst => {
              if (inst.facture === finalFacture) {
                const updates: Partial<Instance> = {};
                if (updated.type && updated.type !== c.type) {
                  updates.mdp = updated.type;
                }
                if (updated.status === 'Payé') {
                  updates.paymentDate = updated.dueDate || c.dueDate;
                } else if (c.status === 'Payé') {
                  updates.paymentDate = null;
                }
                if (Object.keys(updates).length > 0) {
                  api.put(`/instances/${inst.id}`, updates).catch(console.error);
                  return { ...inst, ...updates };
                }
              }
              return inst;
            }));
          }
          return updated;
        }
        return c;
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }, []);

  const updateCheckStatus = useCallback(async (id: string, status: CheckStatus) => {
    try {
      await api.patch(`/checks/${id}/status`, { status });
      setChecks(prev => prev.map(c => {
        if (c.id === id) {
          if (c.facture) {
            setInstances(insts => insts.map(inst => {
              if (inst.facture === c.facture) {
                if (status === 'Payé') {
                  return { ...inst, paymentDate: c.dueDate };
                } else if (c.status === 'Payé') {
                  return { ...inst, paymentDate: null };
                }
              }
              return inst;
            }));
          }
          return { ...c, status };
        }
        return c;
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut.');
    }
  }, []);

  const deleteCheck = useCallback(async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce chèque ?")) return;
    try {
      await api.delete(`/checks/${id}`);
      setChecks(prev => {
        const check = prev.find(c => c.id === id);
        if (check && check.status === 'Payé' && check.facture) {
          setInstances(insts => insts.map(inst => {
            if (inst.facture === check.facture) {
              return { ...inst, paymentDate: null };
            }
            return inst;
          }));
        }
        return prev.filter(c => c.id !== id);
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }, []);

  // Partners
  const addPartnerListItem = useCallback(async (data: Omit<PartnerListItem, "id">) => {
    try {
      const partner = await api.post<PartnerListItem>('/partners', data);
      setPartnerList(prev => [...prev, partner]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du partenaire.');
    }
  }, []);

  const updatePartnerListItem = useCallback(async (id: number, data: Partial<PartnerListItem>) => {
    try {
      await api.put(`/partners/${id}`, data);
      setPartnerList(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }, []);

  const deletePartnerListItem = useCallback(async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce partenaire ?")) return;
    try {
      await api.delete(`/partners/${id}`);
      setPartnerList(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }, []);

  const addMultiplePartnerListItems = useCallback(async (dataArray: Omit<PartnerListItem, "id">[]) => {
    try {
      const addedPartners = await Promise.all(
        dataArray.map(data => api.post<PartnerListItem>('/partners', data))
      );
      setPartnerList(prev => [...prev, ...addedPartners]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout des partenaires.');
    }
  }, []);

  const deleteMultiplePartnerListItems = useCallback(async (ids: number[]) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ces ${ids.length} partenaires ?`)) return;
    try {
      await Promise.all(ids.map(id => api.delete(`/partners/${id}`)));
      setPartnerList(prev => prev.filter(p => !ids.includes(p.id)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression de plusieurs partenaires.');
    }
  }, []);

  // Users
  const addUser = useCallback(async (data: Omit<User, "id"> & { password: string }) => {
    try {
      const user = await api.post<User>('/users', data);
      setUsers(prev => [...prev, user]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'utilisateur.');
    }
  }, []);

  const updateUser = useCallback(async (id: number, data: Partial<User> & { password?: string }) => {
    try {
      await api.put(`/users/${id}`, data);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }, []);

  const deleteUser = useCallback(async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }, []);

  const toggleUserStatus = useCallback(async (id: number) => {
    try {
      await api.patch(`/users/${id}/toggle-status`);
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, status: u.status === "Actif" ? "Inactif" : "Actif" } : u
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }, []);

  // Instances
  const addInstance = useCallback(async (data: Omit<Instance, "id">) => {
    try {
      const instance = await api.post<Instance>('/instances', data);
      setInstances(prev => [instance, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de la facture en instance.');
    }
  }, []);

  const updateInstance = useCallback(async (id: number, data: Partial<Instance>) => {
    try {
      await api.put(`/instances/${id}`, data);
      setInstances(prev => prev.map(inst => inst.id === id ? { ...inst, ...data } : inst));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }, []);

  const deleteInstance = useCallback(async (id: number, skipConfirm?: boolean) => {
    if (!skipConfirm && !window.confirm("Êtes-vous sûr de vouloir supprimer cette facture en instance ?")) return;
    try {
      await api.delete(`/instances/${id}`);
      setInstances(prev => prev.filter(inst => inst.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  }, []);

  return (
    <AppContext.Provider value={{
      bankAccounts, checkbooks, checks, partnerList, instances, users,
      currentUser, isAuthenticated, initialized,
      login, logout, refreshCurrentUser,
      addBankAccount, deleteBankAccount, updateBankAccount,
      addCheckbook, deleteCheckbook,
      addCheck, updateCheck, updateCheckStatus, deleteCheck,
      addPartnerListItem, updatePartnerListItem, deletePartnerListItem,
      addMultiplePartnerListItems, deleteMultiplePartnerListItems,
      addInstance, updateInstance, deleteInstance,
      addUser, updateUser, deleteUser, toggleUserStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
