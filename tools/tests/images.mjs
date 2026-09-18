import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {root,buildSite} from '../build-site.mjs';
import {readJSON,writeJSON,hash,dimensions} from '../lib/content.mjs';
import {optimizeImages} from '../optimize-images.mjs';
const {default:sharp}=await import(process.env.SHARP_MODULE?pathToFileURL(path.resolve(process.env.SHARP_MODULE)).href:'sharp');
sharp.cache(false);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-images-'));
try {
  for(const f of ['site.css','site.js','theme.js','favicon.svg','content/site.json','content/news.json','content/pages']) {
    fs.mkdirSync(path.dirname(path.join(dir,f)),{recursive:true});fs.cpSync(path.join(root,f),path.join(dir,f),{recursive:true});
  }
  const original='assets/projects/test/01.png';
  const p={id:'260918-test-images',status:'published',slug:'test-images',startedAt:'2026-09-18',brand:'TEST',model:'Images',description:'Image pipeline test',scope:['Test'],cover:{file:original,alt:'Cover'},images:[{file:original,alt:'Image'}]};
  writeJSON(path.join(dir,`content/projects/${p.id}/project.json`),p);
  fs.mkdirSync(path.dirname(path.join(dir,original)),{recursive:true});
  await sharp({create:{width:960,height:640,channels:4,background:{r:255,g:0,b:0,alpha:0.5}}}).png().toFile(path.join(dir,original));
  const sourceHash=hash(fs.readFileSync(path.join(dir,original)));
  assert.equal((await optimizeImages(dir,sharp)).generated,2);
  assert.equal(hash(fs.readFileSync(path.join(dir,original))),sourceHash);
  const entry=readJSON(path.join(dir,'content/image-variants.json'))[original];
  assert.deepEqual(entry.images.map(v=>dimensions(path.join(dir,v.file))[0]),[480,960]);
  const metadata=await sharp(path.join(dir,entry.images[0].file)).metadata();assert.ok(metadata.hasAlpha);
  assert.equal((await optimizeImages(dir,sharp)).generated,0);
  buildSite(dir);assert.match(fs.readFileSync(path.join(dir,'dist-static/test-images/index.html'),'utf8'),/srcset=/);
  await sharp({create:{width:960,height:640,channels:4,background:{r:0,g:0,b:255,alpha:0.5}}}).png().toFile(path.join(dir,original));
  assert.equal((await optimizeImages(dir,sharp)).generated,2);
  const updated=readJSON(path.join(dir,'content/image-variants.json'))[original];
  assert.notEqual(entry.hash,updated.hash);
  const release=buildSite(dir);
  for(const image of entry.images) assert.ok(!Object.hasOwn(release.files,image.file));
  console.log('Image pipeline passed: sizes, alpha, original integrity, unchanged-cache reuse, source update and stale variant exclusion.');
} finally {
  if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('portfolio-images-'))throw new Error('Unsafe cleanup');
  fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
