import { describe,expect,it } from 'vitest';
import { fuelTrackingControl,fuelTrackingRate,normalizeRegistration } from '../src/domains/logistique/services/fuelTracking.js';
import { fuelTrackingEntryCreateSchema,fuelTrackingEntryDeleteSchema,fuelTrackingEntryUpdateSchema,fuelTrackingImportSchema } from '../src/domains/logistique/schemas/validation.js';

describe('suivi carburant mensuel',()=>{
  it('normalise les variantes de matricule du classeur',()=>{
    expect(normalizeRegistration(' 23980 a 34 ')).toBe('23980A34');
    expect(normalizeRegistration('29751- A-34')).toBe('29751A34');
  });
  it('calcule la consommation et le contrôle réservoir',()=>{
    expect(fuelTrackingRate(2681,9420)).toBeCloseTo(28.46,2);
    expect(fuelTrackingControl(907.19,650)).toBe('exceeded');
    expect(fuelTrackingControl(550,660)).toBe('ok');
  });
  it('valide une ligne importée',()=>{
    const parsed=fuelTrackingImportSchema.safeParse({sourceName:'suivi.xlsx',vehicles:[{registrationNumber:' ',vehicleType:null,targetConsumption:0,tankCapacity:0}],entries:[{sourceRow:4,registrationNumber:'69256 A 34',occurredOn:'2026-06-03',month:6,fillType:'initial',odometer:243612,distanceTravelled:0,quantity:922,tankCapacity:1100,note:null,unitPrice:0}]});
    expect(parsed.success).toBe(true);
    expect(parsed.success&&parsed.data.vehicles).toHaveLength(0);
    expect(parsed.success&&parsed.data.entries[0].unitPrice).toBeNull();
  });
  it('valide les opérations CRUD avec contrôle de version',()=>{
    const entry={vehicleId:'11111111-1111-4111-8111-111111111111',occurredOn:'2026-11-11',month:11,fillType:'addition',odometer:123456,distanceTravelled:420,quantity:130,note:null,unitPrice:null};
    expect(fuelTrackingEntryCreateSchema.safeParse(entry).success).toBe(true);
    expect(fuelTrackingEntryUpdateSchema.safeParse({...entry,version:2}).success).toBe(true);
    expect(fuelTrackingEntryUpdateSchema.safeParse(entry).success).toBe(false);
    expect(fuelTrackingEntryDeleteSchema.safeParse({version:'2'}).success).toBe(true);
  });
});
