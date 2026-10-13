export type ConsumptionRecord = {
  id: number; branchId: number | null; branchCode: string | null; branchName: string | null;
  year: number; month: number; electricityAmount: number | null; electricityKwh: number | null;
  waterAmount: number | null; waterM3: number | null; telecomInternetFixedAmount: number | null;
  telecomMobileAmount: number | null; notes: string | null;
};
export type Branch = { id:number; code:string; name:string; active:boolean };
export const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
export const totalMoney = (r: ConsumptionRecord) => (r.electricityAmount || 0)+(r.waterAmount || 0)+(r.telecomInternetFixedAmount || 0)+(r.telecomMobileAmount || 0);
export const money = (v:number) => new Intl.NumberFormat('fr-MA',{style:'currency',currency:'MAD',maximumFractionDigits:2}).format(v);
export const number = (v:number) => new Intl.NumberFormat('fr-MA',{maximumFractionDigits:2}).format(v);
export const sum = (rows:ConsumptionRecord[], key:keyof ConsumptionRecord) => rows.reduce((a,r)=>a+(typeof r[key]==='number' ? r[key] as number : 0),0);

