import 'dotenv/config';

const required = ['CENTRAL_DATABASE_URL', 'CHEQUES_DATABASE_URL', 'IMPAYES_DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Variables requises manquantes: ${missing.join(', ')}`);
}

export const config = {
  port: Number(process.env.PORT || 4000),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  centralDb: process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gadimat_identity',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'development-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  secureCookies: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
};
