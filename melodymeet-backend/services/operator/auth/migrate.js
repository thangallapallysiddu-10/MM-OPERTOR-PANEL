// Run auth schema migration against the shared database.
// Usage: node auth/migrate.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const schemaPath = path.resolve(__dirname, 'sql', 'auth.schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  await pool.end();
  console.log('Auth database schema applied successfully.');
}

migrate().catch((err) => {
  console.error('Auth migration failed:', err);
  process.exit(1);
});
