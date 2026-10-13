import { useState } from "react";
import { Plus, Shield, User as UserIcon, Edit2, Trash2, Power, Search } from "lucide-react";
import { useApp, User } from "@/lib/AppContext";
import { NewUserModal, type UserFormData } from "@/components/NewUserModal";

export function Roles() {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"Tous" | "Administrateur" | "Utilisateur">("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === "Tous" || u.role === activeTab;
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const adminCount = users.filter((u) => u.role === "Administrateur").length;
  const userCount = users.filter((u) => u.role === "Utilisateur").length;

  const handleSaveUser = ({ password, ...data }: UserFormData) => {
    if (userToEdit) {
      updateUser(userToEdit.id, password ? { ...data, password } : data);
    } else {
      addUser({ ...data, password });
    }
    setUserToEdit(null);
  };

  const handleEdit = (user: User) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const openNewUserModal = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[18px] mb-0 font-bold text-slate-900 tracking-tight">Rôles & Permissions</h1>
          <p className="text-[12px] text-slate-500 m-0">Gérez les accès de vos collaborateurs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openNewUserModal} className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-[6px] text-[12px] font-semibold hover:opacity-90 transition shadow-sm border-none cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Nouvel Utilisateur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-slate-500">Administrateurs</div>
            <div className="text-[18px] font-bold text-slate-900">{adminCount}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-slate-500">Utilisateurs</div>
            <div className="text-[18px] font-bold text-slate-900">{userCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-[6px]">
            {["Tous", "Administrateur", "Utilisateur"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-all duration-200 border-none cursor-pointer ${
                  activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full sm:w-[200px] pl-9 pr-4 py-1.5 border border-slate-200 rounded-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100">Utilisateur</th>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100">Rôle</th>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100">Statut</th>
                <th className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500 border-b-2 border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 border-b border-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{user.name}</span>
                        <span className="text-[10px] text-slate-500">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">{user.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${user.status === 'Actif' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleUserStatus(user.id)} title={user.status === 'Actif' ? 'Désactiver' : 'Activer'} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors">
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(user)} title="Modifier" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(user.id)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] bg-transparent border-none cursor-pointer transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 border-b border-slate-50">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between text-[11px] text-slate-500 bg-white border-t border-slate-100">
          <div>Affichage de 1 à {filteredUsers.length} sur {filteredUsers.length} entrées</div>
        </div>
      </div>

      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        editUser={userToEdit}
      />
    </div>
  );
}
