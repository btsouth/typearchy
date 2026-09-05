// Synthetic smoke tests for the isolated, authenticated staging deployment only.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
const origin = 'https://typearchy-staging.tsouth2.workers.dev';
const key = readFileSync(new URL('../work/staging-key',import.meta.url),'utf8').trim();
const clients=[];
async function request(path, options={}) {
 const response=await fetch(origin+path,{method:options.method || 'GET',headers:{'X-Typearchy-Staging-Key':key,Origin:origin,...(options.cookie?{Cookie:options.cookie}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},body:options.body?JSON.stringify(options.body):undefined});
 const type=response.headers.get('content-type') || '';
 const data=type.includes('application/json')?await response.json():type.includes('image/')?await response.arrayBuffer():await response.text();
 return {response,data};
}
try {
 assert.equal((await fetch(origin+'/play')).status,404);
 assert.equal((await request('/r/STAGEOLD')).response.status,200);
 assert.equal((await request('/u/staging_legacy')).response.status,200);
 const handle='stage_'+Date.now().toString(36);
 const account=await request('/api/session',{method:'POST',body:{handle}});
 assert.equal(account.response.status,201,JSON.stringify(account.data));
 let cookie=account.response.headers.get('set-cookie').split(';')[0]; clients.push(cookie);
 assert.match(account.response.headers.get('set-cookie'),/Secure/);
 const passage='Clear feedback makes deliberate practice useful.';
 const challenge=await request('/api/challenges',{method:'POST',cookie,body:{title:'Clear feedback',passage,attribution:'Typearchy original passage',language:'prose',autoIndent:false,visibility:'public'}});
 assert.equal(challenge.response.status,201,JSON.stringify(challenge.data));
 const started=await request(`/api/challenges/${challenge.data.slug}/attempts`,{method:'POST',cookie});
 assert.equal(started.response.status,201,JSON.stringify(started.data));
 const events=Array.from(passage,(text,index)=>({type:'input',text,at:index*160}));
 await wait(events.at(-1).at+100);
 const path=`/api/attempts/${started.data.id}`;
 const headers={'X-Attempt-Token':started.data.token};
 const result=await request(path,{method:'POST',headers,body:{events}});
 assert.equal(result.response.status,201,JSON.stringify(result.data));
 const retry=await request(path,{method:'POST',headers,body:{events}});
 assert.equal(retry.data.slug,result.data.slug);
 assert.equal((await request(path+'/publish',{method:'POST',cookie,headers})).response.status,200);
 const paths=[`/a/${result.data.slug}`,`/c/${challenge.data.slug}`,`/og/attempt/${result.data.slug}`];
 const timings=[];
 for(let batch=0;batch<3;batch++) await Promise.all(paths.map(async path=>{const start=performance.now();const value=await request(path);assert.equal(value.response.status,200);timings.push({path:path.split('/')[1],ms:Math.round(performance.now()-start)});}));
 const recovered=await request('/api/session',{method:'POST',body:{action:'recover',handle,recoveryCode:account.data.recoveryCode}});
 assert.equal(recovered.response.status,200,JSON.stringify(recovered.data));
 cookie=recovered.response.headers.get('set-cookie').split(';')[0];clients[0]=cookie;
 assert.equal((await request('/api/session',{cookie:account.response.headers.get('set-cookie').split(';')[0]})).data.handle,null);
 assert.equal((await request('/api/profile',{method:'PATCH',cookie,body:{visibility:'private'}})).response.status,200);
 assert.equal((await request(`/a/${result.data.slug}`)).response.status,404);
 writeFileSync(new URL('../work/staging-check.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),concurrency:3,timings},null,2));
 console.log('Staging passed: legacy URLs, account, challenge, race, retry, publication, OG image, recovery and privacy. Nine read requests at concurrency three passed; timings saved locally.');
} finally {
 for(const cookie of clients) assert.equal((await request('/api/profile',{method:'DELETE',cookie})).response.status,200,'Synthetic account cleanup failed');
}
