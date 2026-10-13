require('dotenv').config();
const { Pool } = require('pg');

module.exports = new Pool({ connectionString: process.env.CHEQUES_DATABASE_URL });
