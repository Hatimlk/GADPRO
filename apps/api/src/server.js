import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'node:module';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import administrationRoutes from './routes/administration.js';
import { authenticate, requireCsrf, requireModule, requireModuleForRequest } from './middleware/auth.js';
import { centralQuery, logisticsQuery } from './db.js';
import logisticsRoutes from './domains/logistique/routes/index.js';
import impayesDossiers from './domains/impayes/routes/dossiers.js';
import impayesAdmin from './domains/impayes/routes/admin.js';
import impayesExport from './domains/impayes/routes/export.js';
import impayesErp from './domains/impayes/routes/erp.js';
import impayesErpSync from './domains/impayes/routes/erpSync.js';
import impayesCron from './domains/impayes/routes/cron.js';

const require = createRequire(import.meta.url);
const chequeRoutes = {
  accounts: require('./domains/cheques/routes/bank-accounts.js'),
  checkbooks: require('./domains/cheques/routes/checkbooks.js'),
  checks: require('./domains/cheques/routes/checks.js'),
  partners: require('./domains/cheques/routes/partners.js'),
  instances: require('./domains/cheques/routes/instances.js'),
  users: require('./domains/cheques/routes/users.js'),
  consumptions: require('./domains/cheques/routes/consumptions.js'),
};

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.webOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
}));
app.use('/api', requireCsrf);
app.use('/api/auth', authRoutes);
app.use('/api/administration', administrationRoutes);

const chequeAccess = [authenticate, requireModuleForRequest('cheques')];
app.use('/api/cheques/bank-accounts', ...chequeAccess, chequeRoutes.accounts);
app.use('/api/cheques/checkbooks', ...chequeAccess, chequeRoutes.checkbooks);
app.use('/api/cheques/checks', ...chequeAccess, chequeRoutes.checks);
app.use('/api/cheques/partners', ...chequeAccess, chequeRoutes.partners);
app.use('/api/cheques/instances', ...chequeAccess, chequeRoutes.instances);
app.use('/api/cheques/users', authenticate, requireModule('cheques', 'admin'), chequeRoutes.users);
app.use('/api/consommations', authenticate, requireModuleForRequest('cheques'), chequeRoutes.consumptions);

const impayesAccess = [authenticate, requireModuleForRequest('impayes')];
app.use('/api/impayes/dossiers', ...impayesAccess, impayesDossiers);
app.use('/api/impayes/admin', ...impayesAccess, impayesAdmin);
app.use('/api/impayes/export', ...impayesAccess, impayesExport);
app.use('/api/impayes/erp', ...impayesAccess, impayesErp);
app.use('/api/impayes/erp-sync', impayesErpSync);
app.use('/api/impayes/cron', impayesCron);
app.use('/api/logistique', authenticate, requireModule('logistique', 'dashboard.read'), logisticsRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await Promise.all([centralQuery('SELECT 1'), logisticsQuery('SELECT 1')]);
    res.json({ status: 'ok', service: 'gadimat-api', identityDatabase: 'connected', logisticsDatabase: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', service: 'gadimat-api', database: 'unavailable', timestamp: new Date().toISOString() });
  }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route API introuvable.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: 'Erreur serveur interne.' });
});
if (process.env.NODE_ENV !== 'test') app.listen(config.port, '127.0.0.1', () => console.log(`GADIMAT API écoute sur 127.0.0.1:${config.port}`));
export default app;
