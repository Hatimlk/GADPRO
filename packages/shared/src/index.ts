export const MODULES = ['cheques', 'impayes', 'consommations', 'administration', 'logistique'] as const;
export type ModuleCode = typeof MODULES[number];
export type ModuleAccess = {
  module: ModuleCode;
  role: string;
  permissions: string[];
  dataScope: Record<string, unknown>;
};
export type CentralUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  platformAdmin: boolean;
  accesses: ModuleAccess[];
};
