import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { formatMAD, cn } from "@/lib/utils";
import {
  Settings, LayoutList, Users, CalendarDays,
  BarChart3, Pencil, User, ChevronDown, CheckCircle2, Activity,
  Calendar as CalendarIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { NewInstanceModal } from "@/components/NewInstanceModal";
import { Instance } from "@/lib/types";

const SemiCircleGauge = ({ value, total, color, label, count, amount }: any) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = [
    { name: 'value', value: percentage },
    { name: 'empty', value: 100 - percentage }
  ];
  return (
    <div className="bg-white rounded-[16px] p-6 border border-slate-100 flex flex-col items-center relative shadow-sm h-[200px] justify-between">
      <div className="absolute top-4 left-4 w-6 h-6 rounded-[6px] flex items-center justify-center text-[11px] font-bold" style={{ color: color, backgroundColor: `${color}1A` }}>
        {count}
      </div>
      <div className="h-[130px] w-[180px] flex justify-center mt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={85} paddingAngle={0} dataKey="value" stroke="none" cornerRadius={10}>
              <Cell fill={color} />
              <Cell fill="#F1F5F9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-[20px] font-bold text-slate-800">{percentage}%</span>
          <span className="text-[11px] font-medium text-slate-400 mt-0.5">{label}</span>
        </div>
      </div>
      <div className="mt-auto font-bold text-[14px] text-[#1E293B]">
        {formatMAD(amount).replace('MAD', 'DH')}
      </div>
    </div>
  );
};

const PARTNERS_SORTS = [
  "Top fournisseur à payer", 
  "Moins fournisseur à payer", 
  "Montant total le plus élevé", 
  "Montant payé le plus élevé", 
  "Nom (A-Z)", 
  "Nom (Z-A)"
];

const CALENDAR_STATUSES = [
  "Tous les statuts",
  "En Attente",
  "En Retard",
  "Réglée"
];

const WEEK_FILTERS = [
  "Tous les statuts", 
  "Non Payé", 
  "Payé"
];

const ANNUAL_FILTERS = [
  "Total des montants à payer par mois",
  "Total des montants déjà payés par mois"
];

function DropdownSelect({ options, value, onChange, prefix = "", buttonClassName = "" }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn("flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-[6px] border border-slate-800 text-[11px] font-bold text-slate-800 whitespace-nowrap cursor-pointer hover:bg-slate-50 relative z-20", buttonClassName)}
      >
        <span>{prefix && <span className="text-slate-500 font-normal">{prefix}</span>}{value}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 top-full mt-1.5 min-w-[220px] w-full bg-white rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 py-1.5 z-40 flex flex-col">
            {options.map((opt: string) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-[12px] transition-colors border-none bg-transparent cursor-pointer",
                  opt === value ? "bg-slate-100 text-slate-800 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Dashboard() {
  const { instances, partnerList } = useApp();
  const navigate = useNavigate();

  const [partnersSort, setPartnersSort] = useState(PARTNERS_SORTS[0]);
  const [calendarFilter, setCalendarFilter] = useState(CALENDAR_STATUSES[0]);
  const [weekFilter, setWeekFilter] = useState(WEEK_FILTERS[0]);
  const [annualFilter, setAnnualFilter] = useState(ANNUAL_FILTERS[0]);
  const [instanceToEdit, setInstanceToEdit] = useState<Instance | null>(null);

  const availableYears = Array.from(new Set<number>([
    ...instances.map(i => parseInt(i.date.substring(0, 4), 10))
  ])).filter(y => !isNaN(y)).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] ?? currentYear);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDueDate = (inst: Instance) => {
    const daysDelay = parseInt(inst.paymentDelay) || 0;
    const due = new Date(inst.date);
    due.setDate(due.getDate() + daysDelay);
    return due;
  };

  const isLate = (inst: Instance) => !inst.paymentDate && getDueDate(inst) < today;
  const isPaid = (inst: Instance) => !!inst.paymentDate;
  const getStatus = (inst: Instance) => isPaid(inst) ? "Réglée" : isLate(inst) ? "En Retard" : "En Attente";

  let totalAmount = 0, totalCount = instances.length;
  let enAttenteAmount = 0, enAttenteCount = 0;
  let enRetardAmount = 0, enRetardCount = 0;
  let payeAmount = 0, payeCount = 0;

  instances.forEach(i => {
    totalAmount += i.amount;
    if (isPaid(i)) {
      payeCount++; payeAmount += i.amount;
    } else if (isLate(i)) {
      enRetardCount++; enRetardAmount += i.amount;
    } else {
      enAttenteCount++; enAttenteAmount += i.amount;
    }
  });

  const getPartnerPaid = (name: string) => instances.filter(i => i.partnerName === name && isPaid(i)).reduce((s, i) => s + i.amount, 0);
  const getPartnerUnpaid = (name: string) => instances.filter(i => i.partnerName === name && !isPaid(i)).reduce((s, i) => s + i.amount, 0);

  const top10Instances = [...instances]
    .filter(i => !isPaid(i))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const topPartners = [...partnerList]
    .sort((a, b) => {
      if (partnersSort === "Top fournisseur à payer") return getPartnerUnpaid(b.name) - getPartnerUnpaid(a.name);
      if (partnersSort === "Moins fournisseur à payer") return getPartnerUnpaid(a.name) - getPartnerUnpaid(b.name);
      if (partnersSort === "Montant total le plus élevé") return (getPartnerPaid(b.name) + getPartnerUnpaid(b.name)) - (getPartnerPaid(a.name) + getPartnerUnpaid(a.name));
      if (partnersSort === "Montant payé le plus élevé") return getPartnerPaid(b.name) - getPartnerPaid(a.name);
      if (partnersSort === "Nom (A-Z)") return a.name.localeCompare(b.name);
      if (partnersSort === "Nom (Z-A)") return b.name.localeCompare(a.name);
      return getPartnerUnpaid(b.name) - getPartnerUnpaid(a.name);
    })
    .slice(0, 4);

  const getDaysInfo = (dueDate: Date) => {
    const diff = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: diff === 0 ? "Auj." : diff < 0 ? `${Math.abs(diff)}j` : `+${diff}`,
      color: diff < 0 ? 'text-red-500 bg-red-50' : diff <= 7 ? 'text-orange-500 bg-orange-50' : 'text-primary bg-primary/10'
    };
  };

  const monthlyStats = (() => {
    const months: Record<string, { total: number; count: number }> = {};
    instances.forEach(i => {
      let match = false;
      const targetDate = isPaid(i) ? (i.paymentDate || i.date) : getDueDate(i).toISOString().substring(0, 10);
      
      if (annualFilter === "Total des montants à payer par mois") {
        match = !isPaid(i) && targetDate.startsWith(String(selectedYear));
      } else if (annualFilter === "Total des montants déjà payés par mois") {
        match = isPaid(i) && targetDate.startsWith(String(selectedYear));
      }

      if (match) {
        const month = targetDate.substring(5, 7);
        if (!months[month]) months[month] = { total: 0, count: 0 };
        months[month].total += i.amount;
        months[month].count++;
      }
    });
    return months;
  })();

  const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  
  const weekInstances = instances.filter(i => {
    const d = getDueDate(i);
    const inRange = d >= today && d <= weekEnd;
    
    let matchFilter = true;
    if (weekFilter === "Non Payé") {
      matchFilter = !isPaid(i);
    } else if (weekFilter === "Payé") {
      matchFilter = isPaid(i);
    }
    
    return inRange && matchFilter;
  }).sort((a, b) => getDueDate(a).getTime() - getDueDate(b).getTime());

  const getNext7Days = () => Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() + idx);
    return d;
  });
  const weekDays = getNext7Days();

  const currentMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const calendarGrid: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarGrid.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarGrid.push(i);
  while (calendarGrid.length % 7 !== 0) calendarGrid.push(null);

  const calendarDaysNames = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
  
  const filteredForCalendar = calendarFilter === "Tous les statuts"
    ? instances
    : instances.filter(i => getStatus(i) === calendarFilter);

  const instancesByDay = filteredForCalendar.reduce<Record<number, typeof instances>>((acc, i) => {
    const targetDateStr = isPaid(i) ? (i.paymentDate || i.date) : getDueDate(i).toISOString().substring(0, 10);
    const d = new Date(targetDateStr + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!acc[day]) acc[day] = [];
      acc[day].push(i);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <SemiCircleGauge value={enAttenteAmount} total={totalAmount} count={enAttenteCount} amount={enAttenteAmount} label="En Attente" color="#F59E0B" />
          <SemiCircleGauge value={enRetardAmount} total={totalAmount} count={enRetardCount} amount={enRetardAmount} label="En Retard" color="#EF4444" />
          <SemiCircleGauge value={payeAmount} total={totalAmount} count={payeCount} amount={payeAmount} label="Réglées" color="#22C55E" />
          <SemiCircleGauge value={totalAmount} total={totalAmount} count={totalCount} amount={totalAmount} label="Total Factures" color="#3B82F6" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-500 shadow-sm">
            <span><CheckCircle2 className="w-3 h-3 text-slate-400 inline mb-0.5" /> Totaux :</span>
            <div className="flex items-center gap-1.5">
              <span className="bg-cyan-100 text-cyan-600 px-1.5 rounded-[4px]">{totalCount}</span>
              <span className="text-[#1E293B] font-bold">{formatMAD(totalAmount).replace('MAD', 'DH')}</span>
            </div>
          </div>
          <button onClick={() => navigate("/roles")} title="Paramètres" className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center border-none shadow-sm cursor-pointer hover:bg-slate-700">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm p-5 flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 font-bold text-[14px] text-slate-800 mb-4">
            <LayoutList className="w-4 h-4 text-slate-400" /> Top 10 Valeurs à Payer
          </div>
          <div className="flex-1 space-y-3">
            {top10Instances.map(inst => (
              <div key={inst.id} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                      isLate(inst) ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                    )}>{isLate(inst) ? 'En Retard' : 'En Attente'}</span>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", getDaysInfo(getDueDate(inst)).color)}>
                      {getDaysInfo(getDueDate(inst)).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase">
                    <User className="w-3 h-3 text-slate-400" /> {inst.partnerName}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="font-bold text-[12px] text-[#1E293B]">{formatMAD(inst.amount).replace('MAD', 'DH')}</div>
                  <div className="flex gap-2">
                    <span title="Modifier"><Pencil onClick={() => setInstanceToEdit(inst)} className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-blue-600" /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/instances")} className="mt-4 w-full py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-blue-600 text-[12px] font-bold rounded-[8px] transition-colors border-none cursor-pointer">
            Voir toutes les instances
          </button>
        </div>

        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm p-5 flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 font-bold text-[14px] text-slate-800 mb-4">
            <Users className="w-4 h-4 text-slate-400" /> Top Fournisseurs
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-1">
            <DropdownSelect 
              options={PARTNERS_SORTS} 
              value={partnersSort} 
              onChange={setPartnersSort} 
              prefix="Trier par: " 
            />
          </div>
          <div className="flex-1 space-y-4">
            {topPartners.map(partner => (
              <div key={partner.id} className="flex flex-col gap-2.5 py-2 border-b border-slate-50 last:border-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {partner.name}
                  </div>
                  <div className="font-bold text-[12px] text-[#1E293B]">{formatMAD(getPartnerPaid(partner.name) + getPartnerUnpaid(partner.name)).replace('MAD', 'DH')}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> {formatMAD(getPartnerPaid(partner.name)).replace('MAD', 'DH')}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    <Activity className="w-3 h-3" /> {formatMAD(getPartnerUnpaid(partner.name)).replace('MAD', 'DH')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/partenaires")} className="mt-4 w-full py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-blue-600 text-[12px] font-bold rounded-[8px] transition-colors border-none cursor-pointer">
            Gérer les partenaires
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm p-5 flex flex-col min-h-[200px] relative">
            <div className="flex items-center gap-2 font-bold text-[14px] text-slate-800 mb-4">
              <BarChart3 className="w-4 h-4 text-slate-400" /> Statistique annuel
            </div>
            <div className="flex flex-col items-start gap-2 mb-4 pb-1 relative z-20">
              <DropdownSelect 
                options={availableYears.length > 0 ? availableYears.map(String) : [String(currentYear)]} 
                value={String(selectedYear)} 
                onChange={(val: string) => setSelectedYear(parseInt(val, 10))} 
                buttonClassName="border-slate-200 text-slate-600 font-medium w-full"
              />
              <DropdownSelect 
                options={ANNUAL_FILTERS} 
                value={annualFilter} 
                onChange={setAnnualFilter} 
                buttonClassName="border-slate-800 text-slate-800 w-full whitespace-normal text-left"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-1 relative z-10">
              {monthNames.map((name, idx) => {
                const key = String(idx + 1).padStart(2, '0');
                const stat = monthlyStats[key];
                return stat ? (
                  <div key={key} className="flex justify-between items-center py-2 text-[11px]">
                    <span className="font-bold text-slate-600">{name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{formatMAD(stat.total).replace('MAD', 'DH')}</span>
                      <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-[4px] font-bold">{stat.count}</span>
                    </div>
                  </div>
                ) : null;
              })}
              {Object.keys(monthlyStats).length === 0 && (
                <div className="text-center text-[12px] text-slate-400 py-4">Aucune donnée pour {selectedYear}</div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm p-5 flex flex-col min-h-[250px]">
            <div className="flex items-center gap-2 font-bold text-[14px] text-slate-800 mb-4">
              <CalendarIcon className="w-4 h-4 text-slate-400" /> À échéance 7 prochains jrs
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {weekDays.map((date, idx) => {
                const dateStr = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                const dayInsts = weekInstances.filter(i => getDueDate(i).toISOString().startsWith(dateKey));
                
                if (dayInsts.length === 0) return null;
                
                return (
                  <div key={idx} className="flex flex-col gap-2 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {dateStr}
                    </div>
                    {dayInsts.map(inst => (
                      <div key={inst.id} className="flex justify-between items-center pl-5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-800">{inst.partnerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[11px] text-slate-800">{formatMAD(inst.amount).replace('MAD', 'DH')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {weekInstances.length === 0 && (
                <div className="text-center text-[12px] text-slate-400 py-4">Aucune facture à échéance dans les 7 jours.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8 mb-4">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-500 shadow-sm">
          <span>Total Factures</span>
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-100 text-slate-600 px-1.5 rounded-[4px]">{instances.length}</span>
            <span className="text-[#1E293B] font-bold">{formatMAD(totalAmount).replace('MAD', 'DH')}</span>
          </div>
        </div>

        <DropdownSelect 
          options={CALENDAR_STATUSES} 
          value={calendarFilter} 
          onChange={setCalendarFilter} 
        />
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-10">
        <div className="p-4 text-center font-bold text-[16px] text-slate-800 border-b border-slate-100">
          <span className="capitalize">{currentMonthName}</span>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 flex gap-4 text-[10px] font-medium">
          <span className="text-slate-500 font-bold">Légende :</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> En Attente</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> En Retard</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Réglée</span>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-[#F8FAFC]">
          {calendarDaysNames.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-500 border-r border-slate-100 last:border-0">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-white">
          {calendarGrid.map((day, idx) => {
            const dayInsts = day ? instancesByDay[day] || [] : [];
            const isToday = day === today.getDate();
            return (
              <div key={idx} className="min-h-[100px] border-r border-b border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors">
                {day && (
                  <>
                    <span className={cn("absolute top-2 right-2 text-[11px] font-semibold", isToday ? "w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center" : "text-slate-400")}>
                      {day}
                    </span>
                    {dayInsts.slice(0, 3).map(inst => (
                      <div
                        key={inst.id}
                        onClick={() => setInstanceToEdit(inst)}
                        className={cn("mt-5 w-full bg-white border rounded-[6px] shadow-sm overflow-hidden border-l-[3px] cursor-pointer hover:shadow-md transition-shadow",
                          isPaid(inst) ? "border-green-500" : isLate(inst) ? "border-red-500" : "border-orange-500"
                        )}
                      >
                        <div className="px-1.5 py-1 text-[8px] font-bold text-slate-600 border-b border-slate-100 uppercase truncate">
                           {inst.facture || "FACTURE"}
                        </div>
                        <div className={cn("px-1.5 py-1 flex items-center justify-between",
                          isPaid(inst) ? "bg-green-50" : isLate(inst) ? "bg-red-50" : "bg-orange-50"
                        )}>
                          <span className="text-[9px] font-bold text-slate-700 truncate">{formatMAD(inst.amount).replace('MAD', 'dh')}</span>
                        </div>
                      </div>
                    ))}
                    {dayInsts.length > 3 && (
                      <div className="mt-1 text-[9px] text-slate-400 text-center font-bold">+{dayInsts.length - 3} de plus</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <NewInstanceModal isOpen={!!instanceToEdit} onClose={() => setInstanceToEdit(null)} editInstance={instanceToEdit} />
    </div>
  );
}
