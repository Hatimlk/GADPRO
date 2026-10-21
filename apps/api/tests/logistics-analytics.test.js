import { describe,expect,it } from 'vitest';
import { analyticsQuerySchema,automationRunSchema } from '../src/domains/logistique/schemas/validation.js';
import { calculateAvailability,calculateCostPerUnit,calculateTrackedOperatingCost,normalizeAnalyticsPeriod } from '../src/domains/logistique/services/analytics.js';
import { scopedFilter } from '../src/domains/logistique/routes/analytics.js';

describe('indicateurs analytiques Logistique',()=>{
  it('ne transmet pas les dates à la requête de comptage des actifs',()=>{
    const req={moduleAccess:{permissions:['*']}};
    const query={from:'2026-01-01',to:'2026-10-21'};
    expect(scopedFilter(req,query,{includePeriod:false})).toEqual({params:[],where:'a.deleted_at IS NULL'});
  });
  it('calcule une disponibilité calendaire bornée',()=>{
    expect(calculateAvailability(100,8)).toBe(92);
    expect(calculateAvailability(100,120)).toBe(0);
    expect(calculateAvailability(0,2)).toBeNull();
  });
  it('additionne uniquement les familles de coûts suivies sans annoncer un TCO',()=>{
    expect(calculateTrackedOperatingCost({maintenance:1000,fuel:500,tires:250})).toBe(1750);
  });
  it('ne calcule un coût unitaire que si le compteur a progressé',()=>{
    expect(calculateCostPerUnit(1250,500)).toBe(2.5);
    expect(calculateCostPerUnit(1250,0)).toBeNull();
  });
  it('normalise une période inclusive et refuse plus de trois ans',()=>{
    expect(normalizeAnalyticsPeriod('2026-01-01','2026-01-31')).toMatchObject({days:31,hoursPerAsset:744});
    expect(normalizeAnalyticsPeriod('2020-01-01','2026-01-01')).toBeNull();
  });
});

describe('validation analytique et automatisation',()=>{
  it('refuse une période inversée',()=>expect(analyticsQuerySchema.safeParse({from:'2026-02-01',to:'2026-01-01'}).success).toBe(false));
  it('accepte une clé de job déterministe',()=>expect(automationRunSchema.safeParse({runKey:'2026-10-20:manual'}).success).toBe(true));
  it('accepte un lancement sans corps et génère la clé côté route',()=>expect(automationRunSchema.safeParse(undefined).success).toBe(true));
  it('refuse une clé contenant des espaces',()=>expect(automationRunSchema.safeParse({runKey:'run du jour'}).success).toBe(false));
});
