import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Droplets, Wifi, Zap } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { ConsumptionRecord, MONTHS, money, sum, totalMoney } from '@/lib/consumptions';

export function ConsumptionBranch(){
 const {code}=useParams();const [all,setAll]=useState<ConsumptionRecord[]>([]);
 useEffect(()=>{api.get<ConsumptionRecord[]>('/consumptions/records').then(setAll)},[]);
 const rows=useMemo(()=>all.filter(r=>r.branchCode===code),[all,code]);const year=Math.max(new Date().getFullYear(),...rows.map(r=>r.year));const current=rows.filter(r=>r.year===year);
 const chart=MONTHS.map((name,i)=>{const r=current.find(x=>x.month===i+1);return{name:name.slice(0,3),electricity:r?.electricityAmount||0,water:r?.waterAmount||0,telecom:(r?.telecomInternetFixedAmount||0)+(r?.telecomMobileAmount||0)}});
 const total=current.reduce((a,r)=>a+totalMoney(r),0);
 return <div className="space-y-6 pb-10"><Link to="/impayes/consommations" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"><ArrowLeft className="h-4 w-4"/>Retour au dashboard</Link><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Historique par branche</p><h1 className="text-3xl font-bold text-slate-950">Rأ©sumأ© {code}</h1><p className="text-sm text-slate-500">Vue annuelle {year}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Card label="Dأ©penses annأ©e" value={money(total)}/><Card label="Moyenne mensuelle" value={money(total/(new Set(current.map(r=>r.month)).size||1))}/><Card label="أ‰lectricitأ©" value={money(sum(current,'electricityAmount'))} icon={Zap}/><Card label="Eau" value={money(sum(current,'waterAmount'))} icon={Droplets}/><Card label="Telecom" value={money(sum(current,'telecomInternetFixedAmount')+sum(current,'telecomMobileAmount'))} icon={Wifi}/></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-5 font-bold">أ‰volution mensuelle â€” {code}</h2><div className="h-96"><ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip formatter={v=>money(Number(v))}/><Legend/><Line dataKey="electricity" name="أ‰lectricitأ©" stroke="#f59e0b" strokeWidth={3}/><Line dataKey="water" name="Eau" stroke="#3b82f6" strokeWidth={3}/><Line dataKey="telecom" name="Telecom" stroke="#8b5cf6" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div></div>
}
function Card({label,value,icon:Icon}:{label:string,value:string,icon?:any}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">{Icon&&<Icon className="h-4 w-4"/>}{label}</div><p className="mt-3 text-xl font-bold">{value}</p></div>}


