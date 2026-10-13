import pg from 'pg';
import { config } from './config.js';

export const centralPool = new pg.Pool({ connectionString: config.centralDb, max: 10 });
export const centralQuery = (text, params) => centralPool.query(text, params);
