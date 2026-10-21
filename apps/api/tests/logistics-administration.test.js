import { describe,expect,it } from 'vitest';
import { auditListSchema,moduleSettingUpdateSchema } from '../src/domains/logistique/schemas/validation.js';
import { logisticsSettingDefinitions,settingsMap,validateLogisticsSetting } from '../src/domains/logistique/services/settings.js';

describe('paramètres Logistique',()=>{
  it('déclare les cinq paramètres administrables',()=>expect(Object.keys(logisticsSettingDefinitions)).toHaveLength(5));
  it('accepte un préavis entier borné',()=>expect(validateLogisticsSetting('alerts.document_expiry_days',45)).toEqual({success:true,value:45}));
  it('refuse un préavis hors limites',()=>expect(validateLogisticsSetting('alerts.driver_license_expiry_days',366).success).toBe(false));
  it('refuse un type incompatible',()=>expect(validateLogisticsSetting('alerts.low_stock_enabled',1).success).toBe(false));
  it('convertit les lignes SQL en dictionnaire',()=>expect(settingsMap([{key:'a',value:true},{key:'b',value:30}])).toEqual({a:true,b:30}));
  it('valide la version optimiste avec la valeur',()=>expect(moduleSettingUpdateSchema.safeParse({value:false,version:2}).success).toBe(true));
});

describe('filtres du journal d’audit',()=>{
  it('applique la pagination par défaut',()=>expect(auditListSchema.parse({})).toMatchObject({page:1,limit:50}));
  it('accepte les filtres combinés',()=>expect(auditListSchema.safeParse({action:'invoice',entityType:'invoice',actorUserId:'a45cefb3-742a-4e38-9fcc-0b337727785f',from:'2026-01-01',to:'2026-01-31'}).success).toBe(true));
  it('refuse une période inversée',()=>expect(auditListSchema.safeParse({from:'2026-02-01',to:'2026-01-31'}).success).toBe(false));
});
