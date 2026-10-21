import { describe,expect,it } from 'vitest';
import { reportFilterSchema } from '../src/domains/logistique/schemas/validation.js';
import { buildReportPdf } from '../src/domains/logistique/services/pdf.js';
import { reportCatalog } from '../src/domains/logistique/services/reporting.js';

describe('rapports Logistique',()=>{
  it('publie les neuf rapports métier attendus',()=>expect(Object.keys(reportCatalog)).toEqual(expect.arrayContaining(['fleet_inventory','maintenance_history','fuel_consumption','tire_lifecycle','provider_performance','preventive_deadlines','spare_parts_stock','fleet_availability','operating_costs'])));
  it('valide les filtres et refuse une période inversée',()=>{expect(reportFilterSchema.safeParse({from:'2026-01-01',to:'2026-12-31'}).success).toBe(true);expect(reportFilterSchema.safeParse({from:'2026-12-31',to:'2026-01-01'}).success).toBe(false);});
  it('génère un PDF autonome et paginé',()=>{const rows=Array.from({length:40},(_,index)=>({reference:`INT-${index+1}`,cost:index*10}));const pdf=buildReportPdf({title:'Historique maintenance',subtitle:'GADIMAT',columns:[{key:'reference',label:'Référence'},{key:'cost',label:'Coût'}],rows,generatedAt:new Date('2026-10-21T10:00:00Z')});expect(pdf.subarray(0,8).toString()).toBe('%PDF-1.4');expect(pdf.toString('latin1')).toContain('/Count 2');expect(pdf.toString('latin1')).toContain('%%EOF');});
  it('produit aussi un PDF valide sans donnée',()=>{const pdf=buildReportPdf({title:'Rapport vide',columns:[{key:'id',label:'ID'}],rows:[]});expect(pdf.toString('latin1')).toContain('0 ligne\\(s\\)');});
});
