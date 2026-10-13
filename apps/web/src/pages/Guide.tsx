import { LayoutDashboard, Briefcase, UserCog, FileEdit, FileUp, CalendarDays, Users, Printer, BookOpen, ChevronRight, CheckCircle2, Play } from "lucide-react";

const sections = [
  {
    title: "Tableau De Bord",
    icon: LayoutDashboard,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Le centre de contrôle de votre application.",
    features: [
      "Visualisez les statistiques globales et le total des chèques émis/payés.",
      "Consultez les graphiques d'évolution des décaissements mensuels.",
      "Suivez les opérations récentes et les alertes de trésorerie en temps réel."
    ]
  },
  {
    title: "Comptes Bancaires",
    icon: Briefcase,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    description: "Gestion de vos comptes bancaires d'entreprise.",
    features: [
      "Ajoutez, modifiez ou archivez vos différents comptes bancaires.",
      "Associez une couleur pour identifier facilement chaque compte.",
      "Consultez le solde actuel et l'historique des opérations de chaque compte."
    ]
  },
  {
    title: "Rôles et Accès",
    icon: UserCog,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Contrôle des permissions des utilisateurs.",
    features: [
      "Gérez les utilisateurs de la plateforme et leurs niveaux d'accès.",
      "Définissez qui peut créer, modifier ou valider les chèques et effets.",
      "Assurez la sécurité et la traçabilité des opérations sensibles."
    ]
  },
  {
    title: "Émis (Chèques et Effets)",
    icon: FileUp,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "Le cœur de l'application : gestion des émissions.",
    features: [
      "Saisissez de nouveaux chèques ou effets en sélectionnant le fournisseur.",
      "Suivez l'état de chaque document (en attente, payé, rejeté).",
      "Filtrez les recherches par type, montant, date, ou fournisseur.",
      "Imprimez directement un document après sa saisie."
    ]
  },
  {
    title: "Calendrier",
    icon: CalendarDays,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    description: "Anticipation et gestion des échéances.",
    features: [
      "Visualisez tous les chèques et effets sur une vue calendrier mensuelle ou hebdomadaire.",
      "Repérez rapidement les décaissements prévus pour anticiper la trésorerie.",
      "Cliquez sur un jour pour voir le détail des échéances."
    ]
  },
  {
    title: "Partenaires / Clients",
    icon: Users,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    description: "Base de données de vos contacts professionnels.",
    features: [
      "Gérez la liste de vos fournisseurs, prestataires et clients.",
      "Consultez l'historique des chèques/effets émis pour chaque partenaire.",
      "Centralisez les informations de contact et les coordonnées bancaires."
    ]
  },
  {
    title: "Module d'Impression",
    icon: Printer,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    description: "Configuration et impression des documents physiques.",
    features: [
      "Ajustez les marges et les positions d'impression pour s'adapter à votre imprimante.",
      "Prévisualisez le rendu avant d'imprimer sur un vrai chèque ou une traite.",
      "Imprimez par lots pour gagner du temps lors des fins de mois."
    ]
  }
];

export function Guide() {
  const handleLaunchInteractiveTour = () => {
    localStorage.removeItem("gadimat_tour_seen");
    window.dispatchEvent(new Event('launch-tour'));
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-10 text-white relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl transform -translate-y-1/2"></div>
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-xl backdrop-blur-md mb-6 ring-1 ring-white/20">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">Guide d'utilisation</h1>
            <p className="text-blue-100 text-lg font-medium leading-relaxed mb-6">
              Bienvenue sur la documentation de Gadimat Chèques. Découvrez comment maîtriser l'ensemble des modules pour gérer efficacement vos chèques et effets.
            </p>
            <button 
              onClick={handleLaunchInteractiveTour}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Play className="w-5 h-5 fill-current" />
              Lancer le guide interactif
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, index) => (
          <div 
            key={index}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-start gap-5">
              <div className={`p-4 rounded-xl ${section.bg} ${section.color} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <section.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{section.title}</h3>
                <p className="text-slate-500 font-medium mb-4">{section.description}</p>
                <ul className="space-y-3">
                  {section.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2.5 text-slate-600 text-[14px]">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${section.color}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 rounded-2xl p-8 border border-blue-100 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Besoin d'aide supplémentaire ?</h3>
          <p className="text-blue-700">Si vous rencontrez des difficultés, n'hésitez pas à contacter le support technique ou votre administrateur système.</p>
        </div>
      </div>
    </div>
  );
}
