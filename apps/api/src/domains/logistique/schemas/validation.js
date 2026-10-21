import { z } from 'zod';

const emptyToNull = (value) => value === '' || value === undefined ? null : value;
const nullableText = (max) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
const nullableDate = z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());
const nullableUuid = z.preprocess(emptyToNull, z.string().uuid().nullable());
const nonNegative = z.coerce.number().finite().min(0);

export const assetStatuses = ['available', 'in_operation', 'under_maintenance', 'immobilized', 'out_of_service', 'sold', 'decommissioned'];
export const fuelTypes = ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg', 'other'];

export const assetCreateSchema = z.object({
  fleetNumber: z.string().trim().min(1).max(80),
  registrationNumber: nullableText(80),
  categoryId: z.string().uuid(),
  brand: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(120),
  serialNumber: nullableText(160),
  vin: nullableText(80),
  manufactureYear: z.preprocess(emptyToNull, z.coerce.number().int().min(1900).max(2200).nullable()),
  acquisitionDate: nullableDate,
  purchaseCost: z.preprocess(emptyToNull, nonNegative.nullable()),
  siteId: z.string().uuid(),
  departmentId: nullableUuid,
  currentMileage: nonNegative.optional().default(0),
  currentOperatingHours: nonNegative.optional().default(0),
  fuelType: z.preprocess(emptyToNull, z.enum(fuelTypes).nullable()),
  status: z.enum(assetStatuses).optional().default('available'),
  notes: nullableText(5000),
});

export const assetUpdateSchema = assetCreateSchema.partial().extend({ version: z.coerce.number().int().positive() });

export const assetListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().max(160).optional(),
  status: z.enum(assetStatuses).optional(),
  categoryId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  assetGroup: z.enum(['vehicles', 'equipment']).optional(),
});

export const meterReadingSchema = z.object({
  meterType: z.enum(['odometer', 'hours']),
  reading: nonNegative,
  recordedAt: z.string().datetime({ offset: true }),
  correctionReason: nullableText(1000),
});

export const driverStatuses = ['active', 'suspended', 'inactive', 'departed'];
export const driverCreateSchema = z.object({
  employeeIdentifier: z.string().trim().min(1).max(80),
  fullName: z.string().trim().min(2).max(200),
  employeeStatus: z.enum(driverStatuses).optional().default('active'),
  professionalPhone: nullableText(40),
  professionalEmail: z.preprocess(emptyToNull, z.string().trim().email().max(255).nullable()),
  licenseExpiryDate: nullableDate,
  notes: nullableText(5000),
});
export const driverUpdateSchema = driverCreateSchema.partial().extend({ version: z.coerce.number().int().positive() });
export const driverListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().max(160).optional(),
  status: z.enum(driverStatuses).optional(),
});

export const assignmentCreateSchema = z.object({
  driverId: z.string().uuid(),
  assetId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  isPrimary: z.boolean().optional().default(false),
  reason: nullableText(1000),
});
export const assignmentEndSchema = z.object({
  endsAt: z.string().datetime({ offset: true }),
});

export const siteSchema = z.object({ code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/), name: z.string().trim().min(1).max(160) });
export const departmentSchema = siteSchema;
export const assetCategorySchema = siteSchema.extend({
  meterType: z.enum(['odometer', 'hours', 'both', 'none']),
  requiresRegistration: z.boolean().optional().default(false),
});
export const referenceStatusSchema = z.object({ active: z.boolean() });

export const providerStatuses = ['active', 'suspended', 'inactive'];
const providerBaseSchema = z.object({
  supplierCode: z.string().trim().min(1).max(80), companyName: z.string().trim().min(2).max(200),
  contactName: nullableText(200), phone: nullableText(40),
  email: z.preprocess(emptyToNull, z.string().trim().email().max(255).nullable()), address: nullableText(2000),
  contractReference: nullableText(120), contractStartsAt: nullableDate, contractEndsAt: nullableDate,
  paymentTerms: nullableText(255), status: z.enum(providerStatuses).optional().default('active'), notes: nullableText(5000),
  specialtyIds: z.array(z.string().uuid()).max(20).optional().default([]),
});
export const providerCreateSchema = providerBaseSchema.refine((value) => !value.contractStartsAt || !value.contractEndsAt || value.contractEndsAt >= value.contractStartsAt, { message: 'La fin du contrat précède son début.', path: ['contractEndsAt'] });
export const providerUpdateSchema = providerBaseSchema.partial().extend({ version: z.coerce.number().int().positive() })
  .refine((value) => !value.contractStartsAt || !value.contractEndsAt || value.contractEndsAt >= value.contractStartsAt, { message: 'La fin du contrat précède son début.', path: ['contractEndsAt'] });
export const providerListSchema = z.object({ page: z.coerce.number().int().min(1).optional().default(1), limit: z.coerce.number().int().min(1).max(100).optional().default(20), search: z.string().trim().max(160).optional(), status: z.enum(providerStatuses).optional() });

export const interventionStatuses = ['requested','validated','planned','in_progress','completed','invoiced','closed','rejected','cancelled','waiting_parts','waiting_quote'];
const interventionBaseSchema = z.object({
  assetId: z.string().uuid(), maintenanceKind: z.enum(['corrective','preventive']).optional().default('corrective'),
  category: z.enum(['mechanical','electrical','tire','bodywork','oil_change','inspection','breakdown','preventive_service','other']),
  issueDescription: z.string().trim().min(3).max(10000), priority: z.enum(['low','normal','high','critical']).optional().default('normal'),
  assignedUserId: nullableUuid, providerId: nullableUuid,
  plannedStartAt: z.preprocess(emptyToNull, z.string().datetime({ offset: true }).nullable()),
  plannedEndAt: z.preprocess(emptyToNull, z.string().datetime({ offset: true }).nullable()),
  mileage: z.preprocess(emptyToNull, nonNegative.nullable()), operatingHours: z.preprocess(emptyToNull, nonNegative.nullable()),
  estimatedCost: z.preprocess(emptyToNull, nonNegative.nullable()), notes: nullableText(5000),
});
export const interventionCreateSchema = interventionBaseSchema.refine((value) => !value.plannedStartAt || !value.plannedEndAt || value.plannedEndAt >= value.plannedStartAt, { message: 'La fin planifiée précède le début.', path: ['plannedEndAt'] });
export const interventionUpdateSchema = interventionBaseSchema.omit({ assetId: true }).partial().extend({ version: z.coerce.number().int().positive() })
  .refine((value) => !value.plannedStartAt || !value.plannedEndAt || value.plannedEndAt >= value.plannedStartAt, { message: 'La fin planifiée précède le début.', path: ['plannedEndAt'] });
export const interventionListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1), limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().max(160).optional(), status: z.enum(interventionStatuses).optional(), assetId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(), priority: z.enum(['low','normal','high','critical']).optional(),
});
export const transitionSchema = z.object({
  toStatus: z.enum(interventionStatuses), reason: nullableText(2000), version: z.coerce.number().int().positive(),
  actualCost: z.preprocess(emptyToNull, nonNegative.nullable()), downtimeHours: z.preprocess(emptyToNull, nonNegative.nullable()),
  completionNotes: nullableText(5000),
}).superRefine((value, context) => {
  if (value.toStatus !== 'completed' && (value.actualCost !== null || value.downtimeHours !== null || value.completionNotes !== null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['toStatus'], message: 'Les données de fin sont réservées à la clôture technique.' });
  }
});

const maintenanceTriggerSchema = z.object({
  triggerType: z.enum(['mileage','hours','calendar']),
  intervalValue: z.coerce.number().positive(),
  intervalUnit: z.enum(['km','hours','days','months','years']),
  warningThreshold: z.coerce.number().min(0).optional().default(0),
}).superRefine((value, context) => {
  const valid = (value.triggerType === 'mileage' && value.intervalUnit === 'km')
    || (value.triggerType === 'hours' && value.intervalUnit === 'hours')
    || (value.triggerType === 'calendar' && ['days','months','years'].includes(value.intervalUnit));
  if (!valid) context.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalUnit'], message: 'Unité incompatible avec le déclencheur.' });
  if (value.triggerType === 'calendar' && !Number.isInteger(value.intervalValue)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalValue'], message: 'L’intervalle calendrier doit être entier.' });
});
export const maintenancePlanCreateSchema = z.object({
  code: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/), operationName: z.string().trim().min(2).max(200),
  description: nullableText(5000), categoryId: nullableUuid, responsibleUserId: nullableUuid,
  estimatedDurationHours: z.preprocess(emptyToNull, nonNegative.nullable()), estimatedCost: z.preprocess(emptyToNull, nonNegative.nullable()),
  status: z.enum(['draft','active','inactive']).optional().default('active'),
  assetIds: z.array(z.string().uuid()).min(1).max(500), triggers: z.array(maintenanceTriggerSchema).min(1).max(3),
}).superRefine((value, context) => {
  if (new Set(value.assetIds).size !== value.assetIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['assetIds'], message: 'Actif dupliqué.' });
  if (new Set(value.triggers.map((item) => item.triggerType)).size !== value.triggers.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['triggers'], message: 'Type de déclencheur dupliqué.' });
});
export const maintenancePlanUpdateSchema = z.object({
  operationName: z.string().trim().min(2).max(200).optional(), description: nullableText(5000).optional(),
  responsibleUserId: nullableUuid.optional(), estimatedDurationHours: z.preprocess(emptyToNull, nonNegative.nullable()).optional(),
  estimatedCost: z.preprocess(emptyToNull, nonNegative.nullable()).optional(), status: z.enum(['draft','active','inactive']).optional(),
  version: z.coerce.number().int().positive(),
});
export const preventiveListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1), limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['upcoming','due','overdue','created','completed','dismissed']).optional(),
});
export const alertListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1), limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['open','acknowledged','resolved']).optional(),
});
export const alertActionSchema = z.object({ version: z.coerce.number().int().positive() });

export const fuelTransactionSchema = z.object({
  assetId:z.string().uuid(),driverId:nullableUuid,stationId:nullableUuid,occurredAt:z.string().datetime({offset:true}),
  fuelType:z.enum(['diesel','gasoline','electric','lpg','other']),quantity:z.coerce.number().positive(),unitPrice:z.coerce.number().positive(),
  meterType:z.enum(['odometer','hours']),meterReading:nonNegative,receiptReference:nullableText(160),notes:nullableText(5000),
});
export const fuelListSchema=z.object({page:z.coerce.number().int().min(1).optional().default(1),limit:z.coerce.number().int().min(1).max(100).optional().default(20),assetId:z.string().uuid().optional(),reviewStatus:z.enum(['pending','clear','flagged','reviewed']).optional()});
export const fuelAnomalyActionSchema=z.object({status:z.enum(['resolved','false_positive']),resolution:z.string().trim().min(3).max(2000),version:z.coerce.number().int().positive()});
export const fuelAnomalySettingSchema=z.object({warningThreshold:z.coerce.number().positive(),criticalThreshold:z.coerce.number().positive(),minimumDelta:z.coerce.number().min(0),historySampleSize:z.coerce.number().int().min(3).max(24),historyMinSamples:z.coerce.number().int().min(3).max(24),deviationWarningRatio:z.coerce.number().gt(1),deviationCriticalRatio:z.coerce.number().gt(1),maximumQuantity:z.preprocess(emptyToNull,z.coerce.number().positive().nullable()),active:z.boolean(),version:z.coerce.number().int().positive()}).superRefine((value,context)=>{if(value.criticalThreshold<=value.warningThreshold)context.addIssue({code:z.ZodIssueCode.custom,message:'Le seuil critique doit dépasser le seuil d’alerte.',path:['criticalThreshold']});if(value.historyMinSamples>value.historySampleSize)context.addIssue({code:z.ZodIssueCode.custom,message:'Le minimum historique ne peut pas dépasser la taille de l’échantillon.',path:['historyMinSamples']});if(value.deviationCriticalRatio<=value.deviationWarningRatio)context.addIssue({code:z.ZodIssueCode.custom,message:'Le ratio critique doit dépasser le ratio d’alerte.',path:['deviationCriticalRatio']});});
export const tireCreateSchema=z.object({internalId:z.string().trim().min(1).max(80),brand:z.string().trim().min(1).max(120),model:nullableText(120),size:z.string().trim().min(1).max(80),dotSerial:nullableText(120),providerId:nullableUuid,purchasedAt:nullableDate,purchaseCost:z.preprocess(emptyToNull,nonNegative.nullable()),notes:nullableText(5000)});
export const tireUpdateSchema=tireCreateSchema.partial().extend({version:z.coerce.number().int().positive()});
export const tireListSchema=z.object({page:z.coerce.number().int().min(1).optional().default(1),limit:z.coerce.number().int().min(1).max(100).optional().default(20),search:z.string().trim().max(160).optional(),status:z.enum(['stock','installed','repair','retired','scrapped']).optional()});
export const tireMovementSchema=z.object({operation:z.enum(['installed','removed','transferred','sent_repair','returned_repair','retired','scrapped']),targetAssetId:nullableUuid,targetPositionId:nullableUuid,mileage:z.preprocess(emptyToNull,nonNegative.nullable()),occurredAt:z.string().datetime({offset:true}),interventionId:nullableUuid,cost:z.preprocess(emptyToNull,nonNegative.nullable()),notes:nullableText(2000),version:z.coerce.number().int().positive()}).superRefine((value,context)=>{const installs=['installed','transferred'].includes(value.operation);if(installs&&(!value.targetAssetId||!value.targetPositionId))context.addIssue({code:z.ZodIssueCode.custom,path:['targetAssetId'],message:'Actif et position cibles requis.'});if(!installs&&(value.targetAssetId||value.targetPositionId))context.addIssue({code:z.ZodIssueCode.custom,path:['targetAssetId'],message:'Aucune cible n’est autorisée pour ce mouvement.'});});

export const sparePartCreateSchema=z.object({sku:z.string().trim().min(1).max(80),name:z.string().trim().min(2).max(200),category:nullableText(120),unit:z.enum(['piece','liter','kg','meter','set']).optional().default('piece'),minimumQuantity:nonNegative.optional().default(0),reorderQuantity:nonNegative.optional().default(0),location:nullableText(160),preferredProviderId:nullableUuid,status:z.enum(['active','inactive','obsolete']).optional().default('active'),notes:nullableText(5000),categoryIds:z.array(z.string().uuid()).max(50).optional().default([]),assetIds:z.array(z.string().uuid()).max(100).optional().default([])});
export const sparePartUpdateSchema=sparePartCreateSchema.omit({categoryIds:true,assetIds:true}).partial().extend({version:z.coerce.number().int().positive()});
export const sparePartListSchema=z.object({page:z.coerce.number().int().min(1).optional().default(1),limit:z.coerce.number().int().min(1).max(100).optional().default(20),search:z.string().trim().max(160).optional(),status:z.enum(['active','inactive','obsolete']).optional(),lowStock:z.enum(['true','false']).optional()});
export const stockMovementSchema=z.object({sparePartId:z.string().uuid(),operation:z.enum(['receipt','issue','return','adjustment']),quantity:z.coerce.number().finite().refine(v=>v!==0,'Quantité non nulle requise.'),unitCost:z.preprocess(emptyToNull,nonNegative.nullable()),occurredAt:z.string().datetime({offset:true}),interventionId:nullableUuid,assetId:nullableUuid,sourceDocument:nullableText(160),reason:nullableText(2000)}).superRefine((value,context)=>{if(['receipt','issue','return'].includes(value.operation)&&value.quantity<=0)context.addIssue({code:z.ZodIssueCode.custom,path:['quantity'],message:'Quantité positive requise.'});if(value.operation==='receipt'&&(!value.unitCost||value.unitCost<=0))context.addIssue({code:z.ZodIssueCode.custom,path:['unitCost'],message:'Coût unitaire requis.'});if(value.operation==='issue'&&(!value.interventionId||!value.assetId))context.addIssue({code:z.ZodIssueCode.custom,path:['interventionId'],message:'Intervention et actif requis pour une sortie.'});if(value.operation==='adjustment'&&!value.reason)context.addIssue({code:z.ZodIssueCode.custom,path:['reason'],message:'Motif requis pour un ajustement.'});});
export const stockMovementListSchema=z.object({page:z.coerce.number().int().min(1).optional().default(1),limit:z.coerce.number().int().min(1).max(100).optional().default(20),sparePartId:z.string().uuid().optional(),operation:z.enum(['receipt','issue','return','adjustment','reversal']).optional()});
export const stockReversalSchema=z.object({reason:z.string().trim().min(3).max(2000)});

const procurementItemSchema=z.object({description:z.string().trim().min(2).max(500),itemType:z.enum(['part','labor','service','other']),sparePartId:nullableUuid,quantity:z.coerce.number().positive(),unitPrice:nonNegative,taxRate:z.coerce.number().min(0).max(100).optional().default(0)}).superRefine((value,context)=>{if(value.itemType!=='part'&&value.sparePartId)context.addIssue({code:z.ZodIssueCode.custom,path:['sparePartId'],message:'Une pièce ne peut être liée qu’à une ligne de type pièce.'});});
export const quotationCreateSchema=z.object({providerId:z.string().uuid(),interventionId:z.string().uuid(),providerReference:nullableText(120),quotationDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),validityDate:nullableDate,notes:nullableText(5000),items:z.array(procurementItemSchema).min(1).max(100)}).superRefine((value,context)=>{if(value.validityDate&&value.validityDate<value.quotationDate)context.addIssue({code:z.ZodIssueCode.custom,path:['validityDate'],message:'La validité doit être postérieure à la date du devis.'});});
export const procurementListSchema=z.object({page:z.coerce.number().int().min(1).optional().default(1),limit:z.coerce.number().int().min(1).max(100).optional().default(20),status:z.string().trim().max(30).optional(),interventionId:z.string().uuid().optional(),providerId:z.string().uuid().optional()});
export const approvalDecisionSchema=z.object({decision:z.enum(['approved','rejected']),reason:nullableText(2000)}).superRefine((value,context)=>{if(value.decision==='rejected'&&!value.reason)context.addIssue({code:z.ZodIssueCode.custom,path:['reason'],message:'Motif obligatoire pour un rejet.'});});
export const purchaseOrderCreateSchema=z.object({quotationId:z.string().uuid(),orderDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),expectedDeliveryDate:nullableDate,notes:nullableText(5000)}).superRefine((value,context)=>{if(value.expectedDeliveryDate&&value.expectedDeliveryDate<value.orderDate)context.addIssue({code:z.ZodIssueCode.custom,path:['expectedDeliveryDate'],message:'La livraison ne peut pas précéder la commande.'});});
export const purchaseOrderIssueSchema=z.object({version:z.coerce.number().int().positive()});
export const invoiceCreateSchema=z.object({purchaseOrderId:z.string().uuid(),supplierInvoiceNumber:z.string().trim().min(1).max(120),invoiceDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),subtotal:nonNegative,taxAmount:nonNegative,notes:nullableText(5000)});
export const entitySubmitSchema=z.object({version:z.coerce.number().int().positive()});
export const documentMetadataSchema=z.object({entityType:z.enum(['asset','intervention','quotation','invoice','provider','driver']),entityId:z.string().uuid(),category:z.enum(['registration','insurance','technical_inspection','ownership','contract','warranty','inspection_report','quotation','invoice','receipt','other']),expiresAt:nullableDate,notes:nullableText(2000)});
export const documentListSchema=z.object({entityType:z.enum(['asset','intervention','quotation','invoice','provider','driver']),entityId:z.string().uuid()});
export const notificationListSchema=z.object({limit:z.coerce.number().int().min(1).max(100).optional().default(30),status:z.enum(['unread','read','archived']).optional()});
export const analyticsQuerySchema=z.object({
  from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  siteId:z.string().uuid().optional(),categoryId:z.string().uuid().optional(),assetId:z.string().uuid().optional(),
}).refine(value=>value.to>=value.from,{message:'La date de fin doit suivre la date de début.',path:['to']});
export const reportFilterSchema=z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),siteId:z.string().uuid().optional(),categoryId:z.string().uuid().optional(),assetId:z.string().uuid().optional(),providerId:z.string().uuid().optional(),driverId:z.string().uuid().optional(),status:z.string().trim().max(40).optional()}).refine(value=>!value.from||!value.to||value.to>=value.from,{message:'La date de fin doit suivre la date de début.',path:['to']});
export const automationRunSchema=z.object({runKey:z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_.:-]+$/).optional()}).default({});
export const moduleSettingUpdateSchema=z.object({value:z.union([z.boolean(),z.number().int()]),version:z.coerce.number().int().positive()});
export const auditListSchema=z.object({page:z.coerce.number().int().min(1).optional().default(1),limit:z.coerce.number().int().min(1).max(100).optional().default(50),action:z.string().trim().max(120).optional(),entityType:z.string().trim().max(100).optional(),actorUserId:z.string().uuid().optional(),from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).refine(value=>!value.from||!value.to||value.to>=value.from,{message:'La date de fin doit suivre la date de début.',path:['to']});

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      error: 'Données invalides.', code: 'VALIDATION_ERROR',
      details: parsed.error.errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    req.validated = parsed.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({
      error: 'Paramètres invalides.', code: 'VALIDATION_ERROR',
      details: parsed.error.errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    req.validatedQuery = parsed.data;
    next();
  };
}
