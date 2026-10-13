const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Email invalide').max(150),
  password: z.string().min(1, 'Mot de passe requis').max(100),
});

const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(150),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères').max(100),
  role: z.enum(['Administrateur', 'Utilisateur']),
  status: z.enum(['Actif', 'Inactif']).optional(),
});

const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(150).optional(),
  role: z.enum(['Administrateur', 'Utilisateur']).optional(),
  status: z.enum(['Actif', 'Inactif']).optional(),
  password: z.string().min(6).max(100).optional(),
});

const bankAccountSchema = z.object({
  bankName: z.string().min(1).max(100),
  rib: z.string().min(1).max(100),
});

const checkbookSchema = z.object({
  bankAccountId: z.string().min(1).max(50),
  bankName: z.string().min(1).max(100),
  type: z.enum(['Chèque', 'Effet']),
  startNumber: z.string().min(1).max(20),
  endNumber: z.string().min(1).max(20),
});

const checkSchema = z.object({
  bankAccountId: z.string().min(1).max(50),
  checkbookId: z.string().max(50).optional().nullable(),
  type: z.enum(['Chèque', 'Effet']),
  number: z.string().min(1).max(50),
  partnerId: z.string().max(50).optional().nullable(),
  partnerName: z.string().min(1).max(200),
  emissionDate: z.string().min(1),
  dueDate: z.string().min(1),
  amount: z.number().positive('Le montant doit être positif'),
  note: z.string().max(2000).optional().nullable(),
  facture: z.string().max(200).optional().nullable(),
  status: z.string().optional(),
});

const checkUpdateSchema = z.object({
  bankAccountId: z.string().max(50).optional(),
  type: z.enum(['Chèque', 'Effet']).optional(),
  number: z.string().max(50).optional(),
  partnerId: z.string().max(50).optional().nullable(),
  partnerName: z.string().max(200).optional(),
  emissionDate: z.string().optional(),
  dueDate: z.string().optional(),
  amount: z.number().positive().optional(),
  status: z.string().optional(),
  note: z.string().max(2000).optional().nullable(),
  facture: z.string().max(200).optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(['En Circulation', 'En Retard', 'Payé', 'Annulé']),
});

const partnerSchema = z.object({
  type: z.enum(['Client', 'Fournisseur']),
  name: z.string().min(1).max(200),
  contact: z.string().max(100).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  balance: z.number().optional(),
  convention: z.string().max(100).optional().nullable(),
});

const partnerUpdateSchema = z.object({
  type: z.enum(['Client', 'Fournisseur']).optional(),
  name: z.string().min(1).max(200).optional(),
  contact: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  balance: z.number().optional(),
  convention: z.string().max(100).optional().nullable(),
});

const instanceSchema = z.object({
  date: z.string().min(1),
  facture: z.string().max(100).optional().default(''),
  partnerId: z.string().max(50).optional().nullable(),
  partnerName: z.string().min(1).max(200),
  amount: z.number(),
  paymentDelay: z.string().min(1).max(100),
  convention: z.string().min(1).max(100),
  mdp: z.string().max(50).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  observation: z.string().max(2000).optional().nullable(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  validate,
  loginSchema, userSchema, userUpdateSchema,
  bankAccountSchema, checkbookSchema,
  checkSchema, checkUpdateSchema, statusSchema,
  partnerSchema, partnerUpdateSchema, instanceSchema,
};
