// Disposable preview content. This command can only target local D1 storage.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { competitionReplay } from '../app/competitionEngine.js';
import { THEMES } from '../app/lib/resultTheme.ts';
import { execFileSync } from 'node:child_process';
const sql = value => "'" + String(value).replaceAll("'", "''") + "'";
const ruby = JSON.parse(readFileSync(new URL('../app/rubySnippets.json', import.meta.url),'utf8'));
const limiter = ruby.find(snippet => snippet.id === 'rails-request-limiter-2024');
const passages = [{ slug: 'prosepreview', title: 'Clear feedback', language: 'prose', passage: 'Clear feedback makes deliberate practice useful.', attribution: 'Typearchy original passage' },
  { ...ruby[1], slug: 'rubypreviewx', attribution: `${ruby[1].author}. Rails (MIT). ${ruby[1].sourceUrl}` },
  { ...limiter, slug: 'railslimiter', attribution: `${limiter.author}. Rails (MIT). ${limiter.sourceUrl}` }];
const statements = ["INSERT OR IGNORE INTO profiles (id,handle,recovery_hash,visibility,created_at,updated_at) VALUES ('local-preview','preview_player','not-a-recovery-hash','public',0,0)"];
for (const passage of passages) {
  const rules = { version: 'competition-1', finish: 'passage', correction: 'required', autoIndent: passage.language !== 'prose' };
  const hash = createHash('sha256').update(JSON.stringify({ passage: passage.passage, rules, language: passage.language })).digest('hex');
  statements.push(`INSERT OR IGNORE INTO challenges (id,slug,creator_id,title,passage,language,attribution,rules_json,content_hash,visibility,created_at,moderation) VALUES (${[passage.slug,passage.slug,'local-preview',passage.title,passage.passage,passage.language,passage.attribution,JSON.stringify(rules),hash,'public',Date.now(),'approved'].map(sql).join(',')})`);
}
for (const [example, sessionId, resultSlug] of [[passages[1], 'preview-ruby-session', 'rubyresultxx'], [passages[2], 'preview-limiter-session', 'railsresultx']]) {
const rules = {version:'competition-1',finish:'passage',correction:'required',autoIndent:true};
const events = Array.from(example.passage.replace(/\n +/g,'\n')).map((text,index)=>({type:'input',text,at:index*90}));
const score = competitionReplay(example.passage,rules,events);
statements.push(`INSERT OR IGNORE INTO attempt_sessions (id,challenge_id,profile_id,token_hash,created_at,expires_at,completed_at) VALUES (${sql(sessionId)},${sql(example.slug)},'local-preview',${sql('disabled-' + sessionId)},1,2,2)`);
statements.push(`INSERT OR IGNORE INTO challenge_attempts (id,slug,challenge_id,profile_id,duration_ms,wpm,raw_wpm,accuracy,errors,characters,progress_json,recording_hash,published,created_at,theme_json) VALUES (${[sessionId,resultSlug,example.slug,'local-preview',score.durationMs,score.wpm,score.rawWpm,score.accuracy,score.errors,score.characters,JSON.stringify(score.progress),'local-preview',1,Date.now(),JSON.stringify(THEMES[1])].map(sql).join(',')})`);
}
const directory = mkdtempSync(join(tmpdir(),'typearchy-preview-'));
try {
  const file = join(directory,'seed.sql'); writeFileSync(file, statements.join(';\n')+';', { mode: 0o600 });
  execFileSync('npx',['wrangler','d1','execute','DB','--local','--config','wrangler.local.json','--file',file],{ cwd: new URL('../',import.meta.url), stdio:'inherit' });
} finally { rmSync(directory,{ recursive:true }); }
console.log('Preview: http://localhost:5177/c/prosepreview and /c/railslimiter');
