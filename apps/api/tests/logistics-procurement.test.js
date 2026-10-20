import { describe,expect,it } from 'vitest';
import { approvalDecisionSchema, invoiceCreateSchema, quotationCreateSchema } from '../src/domains/logistique/schemas/validation.js';
import { calculateInvoiceTotals, calculateQuotationTotals, canDecideApproval, isInvoiceAmountConsistent } from '../src/domains/logistique/services/procurement.js';

const uuid='11111111-1111-4111-8111-111111111111';

describe('calculs achats Logistique',()=>{
  it('recalcule chaque ligne et les totaux du devis côté serveur',()=>{const result=calculateQuotationTotals([{description:'Filtre',itemType:'part',sparePartId:null,quantity:2,unitPrice:100,taxRate:20},{description:'Pose',itemType:'labor',sparePartId:null,quantity:1.5,unitPrice:80,taxRate:10}]);expect(result).toMatchObject({subtotal:320,taxAmount:52,totalAmount:372});expect(result.lines[0]).toMatchObject({subtotal:200,taxAmount:40,totalAmount:240});});
  it('additionne HT et taxe avec arrondi monétaire',()=>expect(calculateInvoiceTotals(100.005,20.004)).toEqual({subtotal:100.01,taxAmount:20,totalAmount:120.01}));
  it('contrôle le plafond de commande',()=>{expect(isInvoiceAmountConsistent(999.99,1000)).toBe(true);expect(isInvoiceAmountConsistent(1000.01,1000)).toBe(false);});
});

describe('séparation demandeur-approbateur',()=>{
  it('interdit toujours l’auto-approbation, même avec le joker',()=>expect(canDecideApproval({actorUserId:uuid,requesterUserId:uuid,permissions:['*'],requiredPermission:'quotations.approve'})).toMatchObject({allowed:false,code:'SELF_APPROVAL_FORBIDDEN'}));
  it('exige la permission configurée',()=>expect(canDecideApproval({actorUserId:uuid,requesterUserId:'22222222-2222-4222-8222-222222222222',permissions:['quotations.read'],requiredPermission:'quotations.approve'})).toMatchObject({allowed:false,code:'PERMISSION_DENIED'}));
  it('autorise un autre approbateur habilité',()=>expect(canDecideApproval({actorUserId:uuid,requesterUserId:'22222222-2222-4222-8222-222222222222',permissions:['quotations.approve'],requiredPermission:'quotations.approve'})).toEqual({allowed:true}));
});

describe('validation achats',()=>{
  it('refuse un devis sans ligne',()=>expect(quotationCreateSchema.safeParse({providerId:uuid,interventionId:uuid,quotationDate:'2026-10-20',items:[]}).success).toBe(false));
  it('refuse une validité antérieure à la date du devis',()=>expect(quotationCreateSchema.safeParse({providerId:uuid,interventionId:uuid,quotationDate:'2026-10-20',validityDate:'2026-10-19',items:[{description:'Service',itemType:'service',quantity:1,unitPrice:100}]}).success).toBe(false));
  it('exige un motif de rejet',()=>expect(approvalDecisionSchema.safeParse({decision:'rejected'}).success).toBe(false));
  it('valide une facture structurée',()=>expect(invoiceCreateSchema.safeParse({purchaseOrderId:uuid,supplierInvoiceNumber:'FA-42',invoiceDate:'2026-10-20',subtotal:100,taxAmount:20}).success).toBe(true));
});
