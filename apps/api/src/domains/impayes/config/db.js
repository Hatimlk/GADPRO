import pg from 'pg';
import dotenv from 'dotenv';
import { buildImpayesPoolConfig } from './connection.js';

dotenv.config();

const dbUrl = process.env.IMPAYES_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/suivi_impaye';
const pool = new pg.Pool(buildImpayesPoolConfig(dbUrl));

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le pool de connexion:', err);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
