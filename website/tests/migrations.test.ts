import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { schemaStatements } from '../db/schema.ts';
const folder = new URL('../migrations/', import.meta.url);
const migrations = readdirSync(folder).filter(name => name.endsWith('.sql')).sort();
const shape = (database: DatabaseSync) => database.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY name").all().map(row => ({...row, sql:String(row.sql).replaceAll('IF NOT EXISTS ','')}));
test('schema snapshot and complete migration chain produce the same database', () => {
  const migrated = new DatabaseSync(':memory:'); const snapshot = new DatabaseSync(':memory:');
  try {
    for (const file of migrations) migrated.exec(readFileSync(new URL(file,folder),'utf8'));
    for (const statement of schemaStatements) snapshot.exec(statement);
    assert.deepEqual(shape(migrated),shape(snapshot));
    assert.deepEqual(migrated.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { migrated.close(); snapshot.close(); }
});
test('upgrading an existing profile preserves old runs and deletion clears competition data', () => {
  const database = new DatabaseSync(':memory:');
  try {
    for (const file of migrations.slice(0,2)) database.exec(readFileSync(new URL(file,folder),'utf8'));
    database.exec("INSERT INTO profiles VALUES ('player','existing_player','hash','public',1,1)");
    database.exec("INSERT INTO runs VALUES ('old','ABCD23','player',1,'old','sprint','sprint:key','words',30,70,72,98,90,2,'[70]',1,1)");
    for (const file of migrations.slice(2)) database.exec(readFileSync(new URL(file,folder),'utf8'));
    assert.equal(database.prepare('SELECT slug FROM runs').get()?.slug,'ABCD23');
    database.exec("INSERT INTO challenges (id,slug,creator_id,title,passage,language,rules_json,content_hash,created_at) VALUES ('challenge','challenge123','player','test','passage','prose','{}','hash',1)");
    assert.equal(database.prepare('SELECT moderation FROM challenges').get()?.moderation,'pending');
    database.exec("INSERT INTO content_reports (id,challenge_id,reason,created_at) VALUES ('report','challenge','other',1)");
    database.exec("INSERT INTO profile_reports (id,profile_id,reason,created_at) VALUES ('profile-report','player','other',1)");
    database.exec("INSERT INTO profile_reviews (id,profile_id,outcome,note,created_at) VALUES ('profile-review','player','suspend','fixture',1)");
    database.exec("DELETE FROM profiles WHERE id = 'player'");
    for (const table of ['runs','challenges','content_reports','profile_reports','profile_reviews']) assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count,0);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { database.close(); }
});
