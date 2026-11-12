import { describe,expect,it } from 'vitest';
import { inventoryBalance,normalizeInventoryReference } from '../src/domains/logistique/services/inventoryTracking.js';
import { inventoryTrackingImportSchema,inventoryTrackingItemUpdateSchema,inventoryTrackingMovementCreateSchema } from '../src/domains/logistique/schemas/validation.js';

describe('suivi du stock G5',()=>{
  it('normalise les variantes de référence',()=>{
    expect(normalizeInventoryReference(' Fl-H-mo-div-mc 473 ')).toBe('flhmodivmc473');
    expect(normalizeInventoryReference('Équipement-01')).toBe('equipement01');
  });
  it('calcule le solde depuis le stock initial',()=>{
    expect(inventoryBalance(52,90,117)).toBe(25);
    expect(inventoryBalance(4,3,8)).toBe(-1);
  });
  it('accepte les dates absentes du journal importé sans perdre le mouvement',()=>{
    const result=inventoryTrackingImportSchema.safeParse({sourceName:'G5-stock.xlsx',items:[{sourceRow:5,reference:'BL-OV',name:'Blouses Ouvrier',openingQuantity:52,declaredQuantity:25,inventoryQuantity:10,inventoryNote:null,unit:'piece'}],movements:[{sourceRow:8,reference:'BL-OV',occurredOn:null,movementType:'exit',quantity:2,requester:'Atelier',vehicleRegistration:null,operationLabel:null,depot:null}]});
    expect(result.success).toBe(true);
  });
  it('valide le CRUD et exige une version pour modifier un article',()=>{
    const item={reference:'BL-OV',name:'Blouses Ouvrier',openingQuantity:52,declaredQuantity:25,inventoryQuantity:10,inventoryNote:null,unit:'piece'};
    expect(inventoryTrackingItemUpdateSchema.safeParse(item).success).toBe(false);
    expect(inventoryTrackingItemUpdateSchema.safeParse({...item,version:1}).success).toBe(true);
    expect(inventoryTrackingMovementCreateSchema.safeParse({itemId:'11111111-1111-4111-8111-111111111111',occurredOn:'2026-11-11',movementType:'entry',quantity:4,requester:null,vehicleRegistration:null,operationLabel:null,depot:null}).success).toBe(true);
  });
});
