import pg from 'pg';
import { config } from './config.js';

export const centralPool = new pg.Pool({ connectionString: config.centralDb, max: 10 });
export const centralQuery = (text, params) => centralPool.query(text, params);

export const logisticsPool = new pg.Pool({ connectionString: config.logisticsDb, max: 10 });
export const logisticsQuery = (text, params) => logisticsPool.query(text, params);
