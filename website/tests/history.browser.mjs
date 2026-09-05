// Disposable browser storage and local Worker only.
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const origin=process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser=await chromium.launch(process.env.TYPEARCHY_CHROMIUM ? {executablePath:process.env.TYPEARCHY_CHROMIUM} : {});
const fixture={id:'old-run',timestamp:'2026-09-04T12:00:00Z',mode:'sprint',target:'PROSE / 30 SEC',wpm:70,raw:74,accuracy:97,consistency:90,errors:2,pace:[60,70],weakKeys:['r'],challengeKey:'sprint:prose:30:generated:prose:one',engineVersion:'2026.08.2'};
async function complete(page,text) {
 await page.goto(origin+'/play');await page.getByLabel('Practice mode',{exact:true}).selectOption('custom');
 await page.getByLabel('CUSTOM PASSAGE',{exact:true}).fill(text);await page.getByRole('button',{name:'APPLY PASSAGE'}).click();
 await page.locator('.demo-input').pressSequentially(text);await expect(page.locator('.web-game-result')).toBeVisible();
}
try {
 const context=await browser.newContext();
 await context.addInitScript(({fixture})=>{if(!localStorage.getItem('test-seeded')){localStorage.setItem('typearchy.web.runs.v1',JSON.stringify(Array.from({length:605},(_,i)=>({...fixture,id:`legacy-${i}`,timestamp:new Date(Date.parse(fixture.timestamp)+i*1000).toISOString()}))));localStorage.setItem('test-seeded','1');}}, {fixture});
 const page=await context.newPage();await page.goto(origin+'/history');await expect(page.locator('.history-overview')).toContainText('605');
 await expect(page.locator('.web-game-history-list button')).toHaveCount(30);await page.getByRole('button',{name:'Load more runs',exact:true}).click();await expect(page.locator('.web-game-history-list button')).toHaveCount(60);
 const a=await context.newPage(),b=await context.newPage();await Promise.all([complete(a,'first saved passage'),complete(b,'second saved passage')]);
 await expect(page.locator('.history-overview')).toContainText('607');await page.reload();await expect(page.locator('.history-overview')).toContainText('607');
 await page.locator('.web-game-history-list button').first().click();await expect(page).toHaveURL(/\/play\?run=/);await expect(page.locator('.web-game-result')).toBeVisible();await page.getByRole('button',{name:/RETRY/}).click();assert.ok(['first saved passage','second saved passage'].includes(await page.locator('.live-prompt').getAttribute('aria-label')));
 await page.goto(origin+'/history');for(const width of [390,800,1280]){await page.setViewportSize({width,height:800});await expect(page.locator('.web-game-history-list button > span').first()).toBeVisible();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByText('Manage history',{exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup'}).click();const download=await downloadPromise;const stream=await download.createReadStream();let body='';for await(const chunk of stream)body+=chunk;
 const backup=JSON.parse(body);assert.equal(backup.runs.length,607);assert.equal(backup.runs.filter(run=>run.passage).length,2);
 await page.getByRole('button',{name:'Clear history',exact:true}).click();await page.getByRole('button',{name:'Clear local history',exact:true}).click();await expect(page.locator('.web-game-empty')).toContainText('Finish a test');await page.reload();await expect(page.locator('.web-game-empty')).toContainText('Finish a test');assert.equal(await page.evaluate(()=>localStorage.getItem('typearchy.web.runs.v1')),null);
 await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(body)});await expect(page.locator('.history-overview')).toContainText('607');
 await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(body)});await expect(page.getByRole('status')).toContainText('Existing runs were preserved');await expect(page.locator('.history-overview')).toContainText('607');await context.close();
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{indexedDB.open=()=>{throw new Error('Storage unavailable');};});const blockedPage=await blocked.newPage();await complete(blockedPage,'kept in this tab');await expect(blockedPage.getByRole('alert')).toContainText('History could not be saved or loaded');await expect(blockedPage.locator('.web-game-result')).toBeVisible();await blocked.close();
 const corrupt=await browser.newContext();await corrupt.addInitScript(()=>localStorage.setItem('typearchy.web.runs.v1','{broken'));const corruptPage=await corrupt.newPage();await corruptPage.goto(origin+'/history');await expect(corruptPage.getByRole('alert')).toBeVisible();assert.equal(await corruptPage.evaluate(()=>localStorage.getItem('typearchy.web.runs.v1')),'{broken');await corruptPage.locator('input[type=file]').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'typearchy-practice',version:1,runs:[fixture]}))});await expect(corruptPage.locator('.history-overview')).toContainText('1');assert.equal(await corruptPage.evaluate(()=>localStorage.getItem('typearchy.web.runs.v1')),'{broken');await corrupt.close();
 const privateContext=await browser.newContext();const privatePage=await privateContext.newPage();
 const theme={name:'OSAKA JADE',short:'OSAKA',bg:'#0b1511',panel:'#101d17',ink:'#d7d7ad',muted:'#6d806f',accent:'#56a47b',error:'#e95d4f'};
 let shared=0;
 const attempt={id:'owned-result',slug:'aaaaaaaaaaaa',created_at:Date.now(),duration_ms:4000,wpm:60,accuracy:98,published:0,title:'Private practice challenge',moderation:'approved',visibility:'public',creator_visibility:'public',challenge_slug:'bbbbbbbbbbbb'};
 await privatePage.route('**/api/account/attempts',route=>{if(route.request().method()==='PATCH'){shared=1;return route.fulfill({json:{published:true}});}return route.fulfill({json:{attempts:[{...attempt,published:shared}],nextCursor:null}});});
 await privatePage.route('**/api/account/attempts/owned-result',route=>route.fulfill({json:{result:{url:origin+'/a/aaaaaaaaaaaa',title:attempt.title,handle:'tester',category:'prose',durationMs:4000,wpm:60,rawWpm:62,accuracy:98,errors:1,challengeUrl:'/c/bbbbbbbbbbbb',passage:'private passage',progress:[[0,0],[4000,15]],theme,validated:true}}}));
 await privatePage.goto(origin+'/history?view=challenges');await privatePage.getByRole('link',{name:'View result',exact:true}).click();
 await expect(privatePage.getByRole('button',{name:'Share result',exact:true})).toHaveCount(0);
 await privatePage.getByRole('button',{name:'Play run',exact:true}).click();await expect(privatePage.locator('.live-result-passage')).toHaveAttribute('open');
 await privatePage.getByRole('link',{name:'Back to history'}).click();await expect(privatePage).toHaveURL(/view=challenges/);
 await privatePage.getByRole('button',{name:'Share result',exact:true}).click();await expect(privatePage.getByRole('button',{name:'Stop sharing',exact:true})).toBeVisible();await privateContext.close();
 console.log('History migration, 607-run retention, concurrent tabs, exact retry, pagination, backup/restore, failed storage and malformed legacy preservation passed.');
} finally {await browser.close();}
