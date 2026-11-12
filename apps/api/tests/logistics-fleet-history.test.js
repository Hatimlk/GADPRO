import { describe,expect,it } from 'vitest';
import { formatFleetRegistration,normalizeFleetRegistration } from '../src/domains/logistique/services/fleetHistory.js';
import { fleetHistoryEntryUpdateSchema,fleetHistoryImportSchema,fleetHistoryVehicleCreateSchema } from '../src/domains/logistique/schemas/validation.js';

describe('état historique du parc',()=>{
  it('normalise les variantes de matricule des deux fichiers',()=>{
    expect(normalizeFleetRegistration(' 76898 A 34 ')).toBe('76898A34');
    expect(formatFleetRegistration('49141-a-34')).toBe('49141-A-34');
  });
  it('valide un tracteur et un porteur',()=>{
    expect(fleetHistoryVehicleCreateSchema.safeParse({registrationNumber:'66913-A-34',fleetType:'tractor',modelLabel:'VOLVO FM 450',chassisNumber:null,registeredOn:'2023-03-31',statusNote:null}).success).toBe(true);
    expect(fleetHistoryVehicleCreateSchema.safeParse({registrationNumber:'69815-A-34',fleetType:'carrier',modelLabel:'MITSUBISH FUSO',chassisNumber:null,registeredOn:null,statusNote:null}).success).toBe(true);
  });
  it('conserve les dates et coûts libres pendant l’import',()=>{
    const parsed=fleetHistoryImportSchema.safeParse({sourceName:'parc.xlsx',vehicles:[{registrationNumber:'16416-A-34',fleetType:'tractor',modelLabel:'ACTROS',chassisNumber:null,registeredOn:null,statusNote:null,sourceSheet:'16416-A-34'}],entries:[{sourceSheet:'16416-A-34',sourceRow:7,registrationNumber:'16416-A-34',occurredOn:null,dateLabel:'24/01 AU 15/02',driverName:'ISSOUR',interventionLabel:'Réparation',mileage:null,costAmount:null,costNote:'GRATUIT',observation:null,providerName:null}]});
    expect(parsed.success).toBe(true);
  });
  it('exige une version pour modifier une intervention',()=>{
    const entry={vehicleId:'11111111-1111-4111-8111-111111111111',occurredOn:'2026-11-12',driverName:null,interventionLabel:'Vidange',mileage:100000,costAmount:1200,costNote:null,observation:null,providerName:null};
    expect(fleetHistoryEntryUpdateSchema.safeParse(entry).success).toBe(false);
    expect(fleetHistoryEntryUpdateSchema.safeParse({...entry,version:1}).success).toBe(true);
  });
});
