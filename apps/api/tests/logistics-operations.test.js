import { describe,expect,it } from 'vitest';
import { fuelAnomalySettingSchema,fuelTransactionSchema,tireMovementSchema } from '../src/domains/logistique/schemas/validation.js';
import { calculateConsumption,detectFuelAnomalies,fuelFingerprint,fuelTotal } from '../src/domains/logistique/services/fuel.js';
import { evaluateTireMovement } from '../src/domains/logistique/services/tires.js';

describe('calculs carburant',()=>{
  it('calcule et arrondit le total côté serveur',()=>expect(fuelTotal(42.375,13.219)).toBe(560.16));
  it('calcule les consommations uniquement sur une progression valide',()=>{
    expect(calculateConsumption({quantity:50,meterReading:11000,previousReading:10500,meterType:'odometer'})).toBe(10);
    expect(calculateConsumption({quantity:50,meterReading:10000,previousReading:10000,meterType:'odometer'})).toBeNull();
  });
  it('produit une empreinte stable sensible aux données métier',()=>{const base={assetId:'a',occurredAt:'2026-10-20T10:00:00Z',stationId:null,quantity:20,totalAmount:240};expect(fuelFingerprint(base)).toBe(fuelFingerprint(base));expect(fuelFingerprint({...base,quantity:21})).not.toBe(fuelFingerprint(base));});
  it('qualifie un dépassement comme signal et non comme fraude',()=>expect(detectFuelAnomalies({consumptionRate:60,meterType:'odometer'})[0]).toMatchObject({ruleCode:'high_consumption',severity:'warning'}));
  it('applique les seuils configurés et l’écart compteur minimal',()=>{const settings={warning_threshold:12,critical_threshold:18,minimum_delta:20,active:true};expect(detectFuelAnomalies({consumptionRate:20,meterType:'odometer',meterDelta:10,settings})).toEqual([]);expect(detectFuelAnomalies({consumptionRate:20,meterType:'odometer',meterDelta:100,settings})[0]).toMatchObject({severity:'critical',expectedValue:12});});
  it('valide la cohérence des seuils',()=>{const valid={warningThreshold:12,criticalThreshold:18,minimumDelta:10,active:true,version:1};expect(fuelAnomalySettingSchema.safeParse(valid).success).toBe(true);expect(fuelAnomalySettingSchema.safeParse({...valid,criticalThreshold:10}).success).toBe(false);});
  it('valide les montants et dates de saisie',()=>{const valid={assetId:'11111111-1111-4111-8111-111111111111',occurredAt:'2026-10-20T10:00:00Z',fuelType:'diesel',quantity:20,unitPrice:12,meterType:'odometer',meterReading:100};expect(fuelTransactionSchema.safeParse(valid).success).toBe(true);expect(fuelTransactionSchema.safeParse({...valid,quantity:0}).success).toBe(false);});
});

describe('cycle de vie des pneumatiques',()=>{
  it('autorise installation, retrait et transfert selon l’état',()=>{expect(evaluateTireMovement({status:'stock',operation:'installed'})).toMatchObject({allowed:true,nextStatus:'installed'});expect(evaluateTireMovement({status:'installed',operation:'removed'})).toMatchObject({allowed:true,nextStatus:'stock'});expect(evaluateTireMovement({status:'installed',operation:'transferred'}).allowed).toBe(true);});
  it('interdit d’installer un pneu déjà installé sans transfert',()=>expect(evaluateTireMovement({status:'installed',operation:'installed'})).toMatchObject({allowed:false,code:'INVALID_TIRE_MOVEMENT'}));
  it('rend irréversible la réforme dans le workflow normal',()=>expect(evaluateTireMovement({status:'scrapped',operation:'installed'}).allowed).toBe(false));
  it('exige actif et position pour une installation',()=>{const base={operation:'installed',occurredAt:'2026-10-20T10:00:00Z',version:1};expect(tireMovementSchema.safeParse(base).success).toBe(false);expect(tireMovementSchema.safeParse({...base,targetAssetId:'11111111-1111-4111-8111-111111111111',targetPositionId:'22222222-2222-4222-8222-222222222222'}).success).toBe(true);});
  it('refuse une cible lors d’un retrait',()=>expect(tireMovementSchema.safeParse({operation:'removed',targetAssetId:'11111111-1111-4111-8111-111111111111',occurredAt:'2026-10-20T10:00:00Z',version:1}).success).toBe(false));
});
