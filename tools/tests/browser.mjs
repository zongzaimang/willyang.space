import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {root} from '../build-site.mjs';
import {readJSON} from '../lib/content.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href:'playwright');
const port='4189',origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['tools/serve-site.mjs'],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
let browser;
try {
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Preview server startup timed out')),10000);
    server.stdout.once('data',()=>{clearTimeout(timer);resolve();});
    server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Preview server exited ${code}`));});
  });
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  const context=await browser.newContext();
  // Tests do not depend on external font availability.
  await context.route('https://fonts.googleapis.com/**',route=>route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const release=readJSON(path.join(root,'dist-static/release.json'));
  const routes=release.routes.filter(r=>r!=='project.html'&&!r.startsWith('240129-'));
  let checks=0;
  for(const route of routes) {
    await page.goto(`${origin}/${route}`);
    for(const width of [320,768,1440]) for(const theme of ['light','dark']) {
      await page.setViewportSize({width,height:900});await page.selectOption('#theme',theme);
      assert.equal(await page.locator('h1').count(),1,route);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route}: overflow at ${width}`);checks++;
    }
    for(const img of await page.locator('main img').all()) await img.evaluate(el=>{el.loading='eager';return el.decode();});
  }
  await page.goto(`${origin}/project.html?id=0`);await page.waitForURL('**/nitecore-hc65-uhe/');
  await page.goto(`${origin}/240129-nitecore-hc65-uhe/`);await page.waitForURL('**/nitecore-hc65-uhe/');
  const first=page.locator('[data-view-image]').first();await first.click();
  assert.ok(await page.locator('#image-viewer').evaluate(el=>el.open));
  await page.locator('.viewer-zoom').click();assert.equal(await page.locator('.viewer-zoom').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');assert.ok(await first.evaluate(el=>el===document.activeElement));
  await page.selectOption('#theme','dark');await page.reload();assert.equal(await page.locator('#theme').inputValue(),'dark');
  assert.equal((await page.request.get(`${origin}/missing-route/`)).status(),404);
  assert.equal((await page.request.get(`${origin}/content/site.json`)).status(),404);
  assert.equal((await page.request.get(`${origin}/_projects/240129%20NITECORE%20HC65%20UHE.md`)).status(),404);
  const noJS=await browser.newContext({javaScriptEnabled:false});const plain=await noJS.newPage();
  await plain.goto(`${origin}/nitecore-hc65-uhe/`);assert.ok(await plain.locator('main img').count()>0);
  assert.equal(errors.length,0,errors.join('\n'));
  const live=spawnSync(process.execPath,['tools/verify-live.mjs',origin],{cwd:root,env:{...process.env,VERIFY_ATTEMPTS:'1'},encoding:'utf8',timeout:60000});
  assert.equal(live.status,0,live.stderr||live.error?.message);
  fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
  await page.screenshot({path:path.join(root,'outputs/architecture-project.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'outputs/architecture-browser-report.json'),JSON.stringify({checks,legacyLinks:true,imageViewer:true,themePersistence:true,noJavaScript:true,sourceIsolation:true,releaseVerification:live.stdout.trim(),errors},null,2));
  console.log(`Browser checks passed: ${checks} route/viewport/theme combinations, images, legacy links, dialog, focus, theme, 404, source isolation, no-JS.`);
} finally {await browser?.close();server.kill();}
