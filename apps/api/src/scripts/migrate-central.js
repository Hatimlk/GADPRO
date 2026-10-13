import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { centralPool } from '../db.js';

const sql = await readFile(resolve(process.cwd(), '../../database/migrations/001_central_identity.sql'), 'utf8');
await centralPool.query(sql);
console.log('Schéma central appliqué.');
await centralPool.end();
