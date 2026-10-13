import { useState, useEffect } from "react";
import { Joyride, EventData, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface CustomStep extends Step {
  route?: string;
  icon?: React.ReactNode;
}

const Tooltip = ({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) => {
  return (
    <div {...tooltipProps} className="bg-white rounded-2xl shadow-2xl w-[380px] border border-slate-100 overflow-hidden font-sans">
      <div className="relative p-5">
        <button 
          {...closeProps} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-3 mb-3">
          {(step as CustomStep).icon && (
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              {(step as CustomStep).icon}
            </div>
          )}
          {step.title && (
            <h3 className="font-bold text-slate-900 text-lg leading-tight">{step.title}</h3>
          )}
        </div>
        
        <div className="text-slate-600 text-[14px] leading-relaxed mb-4">
          {step.content}
        </div>
      </div>

      <div className="bg-slate-50/80 px-5 py-4 flex items-center justify-between border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {index + 1} / {size}
          </span>
        </div>
        <div className="flex gap-2">
          {index > 0 && (
            <button 
              {...backProps} 
              className="px-3 py-2 flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          
          {index === 0 && (
            <button 
              {...skipProps} 
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              Passer
            </button>
          )}

          {continuous ? (
            <button 
              {...primaryProps} 
              className="px-4 py-2 flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-95"
            >
              {index === size - 1 ? (
                <>Terminer <Check size={16} /></>
              ) : (
                <>Suivant <ChevronRight size={16} /></>
              )}
            </button>
          ) : (
            <button 
              {...closeProps} 
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-95"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export function AppTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("gadimat_tour_seen");
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setStepIndex(0);
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    const handleLaunchTour = () => {
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener('launch-tour', handleLaunchTour);
    
    return () => {
      window.removeEventListener('launch-tour', handleLaunchTour);
    };
  }, []);

  const steps: CustomStep[] = [
    {
      target: "body",
      title: "Bienvenue sur Gadimat !",
      content: "Découvrons ensemble comment gérer efficacement vos chèques et effets à travers cette plateforme moderne.",
      placement: "center",
      skipBeacon: true,
      route: "/",
      icon: <span className="text-xl">🚀</span>
    },
    {
      target: "[data-tour='Tableau De Bord']",
      title: "Tableau de Bord",
      content: "Votre espace principal. Retrouvez ici un résumé visuel de vos décaissements, avec des graphiques clairs et précis.",
      placement: "right",
      route: "/",
      icon: <span className="text-xl">📊</span>
    },
    {
      target: "[data-tour='Comptes']",
      title: "Comptes Bancaires",
      content: "C'est ici que vous définissez les comptes bancaires qui serviront à l'émission de vos chèques et traites.",
      placement: "right",
      route: "/comptes",
      icon: <span className="text-xl">🏦</span>
    },
    {
      target: ".add-account-btn",
      title: "Ajouter un Compte",
      content: "Vous pouvez ajouter un nouveau compte à tout moment en cliquant ici. N'oubliez pas de lui attribuer une couleur !",
      placement: "bottom",
      route: "/comptes",
      icon: <span className="text-xl">➕</span>
    },
    {
      target: "[data-tour='Rôles']",
      title: "Gestion des Rôles",
      content: "Gérez les accès de votre équipe. En tant qu'administrateur, vous pouvez ajouter des utilisateurs et définir leurs permissions.",
      placement: "right",
      route: "/roles",
      icon: <span className="text-xl">🔐</span>
    },
    {
      target: "[data-tour='Émis']",
      title: "Émissions",
      content: "Le cœur de l'application : retrouvez la liste complète des chèques et effets émis, et suivez leur statut en temps réel.",
      placement: "right",
      route: "/emis",
      icon: <span className="text-xl">💸</span>
    },
    {
      target: ".filters-bar",
      title: "Filtres Avancés",
      content: "Utilisez ces filtres pour retrouver instantanément un document par date, montant, fournisseur/bénéficiaire ou statut (Payé, Rejeté...).",
      placement: "bottom",
      route: "/emis",
      icon: <span className="text-xl">🔍</span>
    },
    {
      target: "[data-tour='Réglés']",
      title: "Documents Réglés",
      content: "Consultez l'historique de tous vos chèques et effets qui ont été payés et réglés définitivement.",
      placement: "right",
      route: "/regles",
      icon: <span className="text-xl">✅</span>
    },
    {
      target: "[data-tour='Instances']",
      title: "Instances",
      content: "Suivez vos factures et paiements en attente. Une vue claire pour ne rater aucune échéance et imprimer directement vos chèques/effets.",
      placement: "right",
      route: "/instances",
      icon: <span className="text-xl">⏳</span>
    },
    {
      target: "[data-tour='Calendrier']",
      title: "Calendrier des Échéances",
      content: "Une vue indispensable pour anticiper votre trésorerie. Repérez d'un coup d'œil les décaissements prévus dans le mois.",
      placement: "right",
      route: "/calendrier",
      icon: <span className="text-xl">📅</span>
    },
    {
      target: "[data-tour='Les Clients']",
      title: "Gestion des Partenaires",
      content: "Accédez à la liste complète de vos fournisseurs/bénéficiaires (partenaires et clients) pour faciliter le suivi des transactions.",
      placement: "right",
      route: "/partenaires",
      icon: <span className="text-xl">👥</span>
    },
    {
      target: "[data-tour='Impression']",
      title: "Module d'Impression",
      content: "Imprimez directement vos chèques et effets sur papier physique en configurant vos modèles d'impression par banque.",
      placement: "right",
      route: "/impression",
      icon: <span className="text-xl">🖨️</span>
    },
    {
      target: "body",
      title: "Vous êtes prêt !",
      content: "Vous avez maintenant toutes les cartes en main. Bonne navigation !",
      placement: "center",
      route: "/",
      icon: <span className="text-xl">✨</span>
    }
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      localStorage.setItem("gadimat_tour_seen", "true");
      setStepIndex(0);
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      if (nextStepIndex >= 0 && nextStepIndex < steps.length) {
        const nextRoute = steps[nextStepIndex].route;
        
        if (nextRoute && location.pathname !== nextRoute) {
          // Navigate to the required route
          navigate(nextRoute);
          // Wait briefly for the page transition before showing the next step
          setTimeout(() => {
            setStepIndex(nextStepIndex);
          }, 400); 
        } else {
          setStepIndex(nextStepIndex);
        }
      } else if (nextStepIndex >= steps.length) {
        // Completed the tour
        setRun(false);
        localStorage.setItem("gadimat_tour_seen", "true");
        setStepIndex(0);
      }
    }
  };

  return (
    <Joyride
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      options={{
        showProgress: false,
        zIndex: 10000,
        overlayColor: 'rgba(15, 23, 42, 0.65)',
      }}
      steps={steps}
      tooltipComponent={Tooltip}
    />
  );
}
