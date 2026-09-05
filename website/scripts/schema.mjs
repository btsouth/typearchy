import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const database = new DatabaseSync(':memory:');
const migrations = new URL('../migrations/', import.meta.url);
for (const file of readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) database.exec(readFileSync(new URL(file, migrations), 'utf8'));
const statements = database.prepare("SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY rowid").all().map(row => row.sql.replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS '));
const output = '// Generated from migrations by node scripts/schema.mjs. Do not edit.\nexport const schemaStatements = '+JSON.stringify(statements,null,2)+';\n';
const target = new URL('../db/schema.ts', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target,'utf8') !== output) throw new Error('Schema snapshot differs from migrations. Run node scripts/schema.mjs.');
} else writeFileSync(target, output);
database.close();
