import { describe,expect,it } from 'vitest';
import { stockMovementSchema } from '../src/domains/logistique/schemas/validation.js';
import { calculateStockMutation,signedQuantity } from '../src/domains/logistique/services/stock.js';

describe('valorisation du stock',()=>{
  it('calcule un coût moyen pondéré après réception',()=>expect(calculateStockMutation({quantityOnHand:10,averageCost:20,quantitySigned:5,unitCost:30})).toMatchObject({allowed:true,balanceAfter:15,averageCostAfter:23.3333,totalValue:150}));
  it('conserve le coût moyen lors d’une sortie',()=>expect(calculateStockMutation({quantityOnHand:10,averageCost:20,quantitySigned:-4,unitCost:20})).toMatchObject({allowed:true,balanceAfter:6,averageCostAfter:20,totalValue:-80}));
  it('refuse un stock négatif par défaut',()=>expect(calculateStockMutation({quantityOnHand:2,averageCost:20,quantitySigned:-3,unitCost:20})).toMatchObject({allowed:false,code:'NEGATIVE_STOCK'}));
  it('autorise explicitement un stock négatif en conservant le coût courant',()=>expect(calculateStockMutation({quantityOnHand:2,averageCost:20,quantitySigned:-3,unitCost:20,allowNegative:true})).toMatchObject({allowed:true,balanceAfter:-1,averageCostAfter:20}));
  it('inverse correctement le signe selon l’opération',()=>{expect(signedQuantity('issue',5)).toBe(-5);expect(signedQuantity('receipt',5)).toBe(5);expect(signedQuantity('adjustment',-2)).toBe(-2);});
});

describe('validation des mouvements de stock',()=>{
  const base={sparePartId:'11111111-1111-4111-8111-111111111111',quantity:2,occurredAt:'2026-10-20T10:00:00Z'};
  it('exige un coût pour une réception',()=>{expect(stockMovementSchema.safeParse({...base,operation:'receipt'}).success).toBe(false);expect(stockMovementSchema.safeParse({...base,operation:'receipt',unitCost:25}).success).toBe(true);});
  it('exige intervention et actif pour une sortie',()=>expect(stockMovementSchema.safeParse({...base,operation:'issue'}).success).toBe(false));
  it('exige un motif pour un ajustement',()=>expect(stockMovementSchema.safeParse({...base,operation:'adjustment',quantity:-1}).success).toBe(false));
});
