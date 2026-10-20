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
