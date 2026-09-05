// Dedicated disposable fixtures against local D1 and localhost only.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5177';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'Integration tests only run against a local server');
const configured = readFileSync(new URL('../.dev.vars', import.meta.url),'utf8');
assert.match(configured,/TYPEARCHY_MODERATOR_PROFILE_IDS=local-moderation-test(?:\n|$)/,'Use the documented local moderation fixture configuration');
const directory = mkdtempSync(join(tmpdir(),'typearchy-moderation-'));
const token = 'tpy_' + randomBytes(32).toString('hex');
const hash = createHash('sha256').update(token).digest('hex');
function sql(command) {
  const file = join(directory,'fixture.sql'); writeFileSync(file,command,{mode:0o600});
  execFileSync('npx',['wrangler','d1','execute','DB','--local','--config','wrangler.local.json','--file',file],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
}
async function request(path, method='GET',body) {
  const response = await fetch(origin+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  return {response,data};
}
try {
  sql(`DELETE FROM profiles WHERE id = 'local-moderation-test'; INSERT INTO profiles (id,handle,recovery_hash,visibility,created_at,updated_at) VALUES ('local-moderation-test','local_review_tester','disabled','public',1,1); INSERT INTO devices (id,profile_id,token_hash,label,created_at,last_used_at) VALUES ('moderation-device','local-moderation-test','${hash}','local test',1,1);`);
  const created = await request('/api/challenges','POST',{title:'Community review fixture',passage:'Clear feedback makes deliberate practice useful.',language:'prose',autoIndent:false,visibility:'public'});
  assert.equal(created.response.status,201,JSON.stringify(created.data));
  const slug = created.data.slug;
  assert.equal((await fetch(origin+'/api/challenges/'+slug)).status,200,'Unreviewed passages are reachable by link');
  assert.equal((await fetch(origin+'/og/challenge/'+slug)).status,200);
  assert.ok(!(await (await fetch(origin+'/challenges')).text()).includes('Community review fixture'),'Unreviewed passages stay out of the library');
  const queue = await request('/api/moderation');
  assert.equal(queue.response.status,200,JSON.stringify(queue.data));
  assert.ok(queue.data.challenges.some(challenge=>challenge.slug===slug));
  const approve = await request('/api/moderation','PATCH',{slug,status:'approved',note:'Reviewed local test passage'});
  assert.equal(approve.response.status,200,JSON.stringify(approve.data));
  assert.equal((await fetch(origin+'/api/challenges/'+slug)).status,200);
  assert.ok((await (await fetch(origin+'/challenges')).text()).includes('Community review fixture'),'Approval lists the passage');
  const report = await request('/api/challenges/'+slug+'/report','POST',{reason:'other',detail:'Local report fixture'});
  assert.equal(report.response.status,201);
  assert.ok((await request('/api/moderation')).data.reports.some(report=>report.slug===slug));
  assert.equal((await request('/api/moderation','PATCH',{slug,status:'rejected',note:'Not suitable for the shared library'})).response.status,200);
  assert.equal((await fetch(origin+'/api/challenges/'+slug)).status,404);
  assert.equal((await fetch(origin+'/og/challenge/'+slug)).status,404);
  const own = await request('/api/account/challenges');
  assert.equal(own.data.challenges[0].review_note,'Not suitable for the shared library');
  assert.ok(!(await request('/api/moderation')).data.reports.some(report=>report.slug===slug));
  const player = await fetch(origin+'/api/session', {method:'POST', headers:{'Content-Type':'application/json',Origin:origin,'CF-Connecting-IP':'profile-review-'+Date.now()},body:JSON.stringify({handle:'review_'+Date.now().toString(36)})});
  assert.equal(player.status,201);
  await player.json();
  const cookie = player.headers.get('set-cookie').split(';')[0];
  async function asPlayer(path, method='GET', body) {
    return fetch(origin+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  }
  const playerAccount = await (await asPlayer('/api/account')).json();
  try {
    assert.equal((await asPlayer('/api/moderation','PATCH',{handle:playerAccount.handle,action:'restore',note:'local permission check'})).status,403);
    const profileReport = await request(`/api/profiles/${playerAccount.handle}/report`,'POST',{reason:'impersonation',detail:'Disposable local moderation fixture'});
    assert.equal(profileReport.response.status,201);
    assert.ok((await request('/api/moderation')).data.profileReports.some(report=>report.handle===playerAccount.handle));
    assert.equal((await request('/api/moderation','PATCH',{handle:playerAccount.handle,action:'suspend',note:'Local moderation test'})).response.status,200);
    assert.equal((await fetch(origin+'/u/'+playerAccount.handle)).status,404);
    assert.equal((await asPlayer('/api/profile','PATCH',{visibility:'public'})).status,403,'Restriction must survive a player visibility change');
    const account = await (await asPlayer('/api/account')).json();
    assert.equal(account.suspended,1); assert.equal(account.moderation_note,'Local moderation test');
    assert.ok(!(await request('/api/moderation')).data.profileReports.some(report=>report.handle===playerAccount.handle));
    assert.equal((await request('/api/moderation','PATCH',{handle:playerAccount.handle,action:'restore',note:'Local test resolved'})).response.status,200);
    assert.equal((await fetch(origin+'/u/'+playerAccount.handle)).status,404,'Restoring access must not publish the player automatically');
    assert.equal((await asPlayer('/api/profile','PATCH',{visibility:'public'})).status,200);
    assert.equal((await fetch(origin+'/u/'+playerAccount.handle)).status,200);
  } finally { assert.equal((await asPlayer('/api/profile','DELETE')).status,200); }
  console.log('Local moderation passed: link access before review, library listing after approval, approval, reporting, rejection, social-card removal, review feedback, report resolution, profile restriction, and restoration.');
} finally {
  sql("DELETE FROM profiles WHERE id = 'local-moderation-test'");
  rmSync(directory,{recursive:true,force:true});
}
