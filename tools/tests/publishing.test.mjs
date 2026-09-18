import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildSite,root} from '../build-site.mjs';
import {readJSON,writeJSON,loadContent,hash} from '../lib/content.mjs';
import {verifyArtifact} from '../lib/artifact.mjs';
import {newProject,setStatus,importProject} from '../project.mjs';
import {saveRelease,restoreRelease} from '../release.mjs';

function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-test-'));
  for(const name of ['content','assets','site.css','site.js','theme.js','favicon.svg']) fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
  t.after(()=>{if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('portfolio-test-'))throw new Error('Unsafe cleanup');fs.rmSync(dir,{recursive:true,force:true});});
  return dir;
}
const id='240129-nitecore-hc65-uhe';
const config=dir=>path.join(dir,`content/projects/${id}/project.json`);

test('build is reproducible, preserves legacy routes, and excludes source and unused assets',t=>{
  const dir=fixture(t),first=buildSite(dir),second=buildSite(dir);
  assert.equal(first.version,second.version);
  const out=path.join(dir,'dist-static');
  assert.equal(first.routes.length,11);
  assert.ok(first.routes.includes(`${id}/index.html`));
  assert.match(fs.readFileSync(path.join(out,'project.html'),'utf8'),/"0":"\/nitecore-hc65-uhe\/"/);
  assert.ok(!fs.existsSync(path.join(out,'content')));
  assert.ok(!fs.existsSync(path.join(out,'assets/hc65-uhe/01-cover.png')));
  verifyArtifact(out);
});
test('drafts, ready items, archives and their unique images never enter production',t=>{
  const dir=fixture(t);
  for(const status of ['draft','ready','archived']) {
    const p=readJSON(config(dir));p.status=status;writeJSON(config(dir),p);
    buildSite(dir);
    const out=path.join(dir,'dist-static');
    assert.ok(!fs.existsSync(path.join(out,'nitecore-hc65-uhe')));
    assert.ok(!fs.existsSync(path.join(out,id)));
    for(const image of [p.cover,...p.images]) assert.ok(!fs.existsSync(path.join(out,image.file)));
    assert.doesNotMatch(fs.readFileSync(path.join(out,'project.html'),'utf8'),/"0":/);
  }
});
test('failed validation preserves the previous release; duplicates and bad paths fail clearly',t=>{
  const dir=fixture(t),before=buildSite(dir),original=readJSON(config(dir));
  for(const mutate of [p=>p.cover.file='assets/missing.png',p=>p.slug='about',p=>p.cover.file='assets/../package.json',p=>p.startedAt='2024-02-30']) {
    const p=structuredClone(original);mutate(p);writeJSON(config(dir),p);
    assert.throws(()=>buildSite(dir));
    assert.equal(verifyArtifact(path.join(dir,'dist-static')).version,before.version);
  }
});
test('removing an image or archiving a project cleans repeated builds while retaining local originals',t=>{
  const dir=fixture(t);buildSite(dir);
  const p=readJSON(config(dir)),removed=p.images.pop();writeJSON(config(dir),p);buildSite(dir);
  assert.ok(!fs.existsSync(path.join(dir,'dist-static',removed.file)));
  assert.ok(fs.existsSync(path.join(dir,removed.file)));
  setStatus(dir,id,'archived');buildSite(dir);
  assert.ok(!fs.existsSync(path.join(dir,'dist-static/nitecore-hc65-uhe/index.html')));
});
test('new → import preview → apply → ready → preview → published works without editing templates',t=>{
  const dir=fixture(t),newId='260918-test-product';
  newProject(dir,newId);
  const file=path.join(dir,`content/projects/${newId}/project.json`),p=readJSON(file);
  p.brand='TEST';p.model='Product';p.description='Test description';p.scope=['Industrial design'];writeJSON(file,p);
  const source=path.join(dir,'exports');fs.mkdirSync(source);
  const image=readJSON(config(dir)).images[0].file;
  fs.copyFileSync(path.join(dir,image),path.join(source,'01.png'));
  const before=fs.readFileSync(file,'utf8');
  assert.equal(importProject(dir,newId,source).applied,false);
  assert.equal(fs.readFileSync(file,'utf8'),before);
  importProject(dir,newId,source,{apply:true});
  assert.throws(()=>setStatus(dir,newId,'published'),/ready/);
  setStatus(dir,newId,'ready');
  const preview=buildSite(dir,{preview:true});assert.equal(preview.preview,true);
  assert.ok(fs.existsSync(path.join(dir,'dist-preview/test-product/index.html')));
  buildSite(dir);assert.ok(!fs.existsSync(path.join(dir,'dist-static/test-product')));
  setStatus(dir,newId,'published');buildSite(dir);
  assert.ok(fs.existsSync(path.join(dir,'dist-static/test-product/index.html')));
});
test('import rejects duplicate positions, tracks removals, and preserves originals and captions by content hash',t=>{
  const dir=fixture(t),source=path.join(dir,'exports');fs.mkdirSync(source);
  const original=readJSON(config(dir)),first=original.images[0];
  fs.copyFileSync(path.join(dir,first.file),path.join(source,'01.png'));
  fs.copyFileSync(path.join(dir,first.file),path.join(source,'01@1x.png'));
  assert.throws(()=>importProject(dir,id,source,{apply:true}),/Duplicate/);
  fs.unlinkSync(path.join(source,'01@1x.png'));
  const report=importProject(dir,id,source,{apply:true});
  assert.ok(report.report.some(r=>r.status==='removed-from-manifest'));
  const updated=readJSON(config(dir));assert.equal(updated.images.length,1);assert.equal(updated.images[0].caption,first.caption);
  assert.ok(original.images.every(i=>fs.existsSync(path.join(dir,i.file))));
  buildSite(dir);assert.ok(!fs.existsSync(path.join(dir,'dist-static',original.images[1].file)));
});
test('release rollback restores exact bytes and rejects tampering and extra files',t=>{
  const dir=fixture(t);buildSite(dir);const version=saveRelease(dir);
  const p=readJSON(config(dir));p.description='Changed copy';writeJSON(config(dir),p);
  assert.notEqual(buildSite(dir).version,version);
  assert.equal(restoreRelease(dir,version).version,version);
  assert.equal(readJSON(config(dir)).description,'Changed copy');
  fs.writeFileSync(path.join(dir,'dist-static/unexpected.txt'),'private');
  assert.throws(()=>verifyArtifact(path.join(dir,'dist-static')),/unexpected/);
  fs.appendFileSync(path.join(dir,`releases/${version}/index.html`),'tampered');
  assert.throws(()=>restoreRelease(dir,version),/checksum/);
});
test('stale responsive variants fall back to originals and are not copied',t=>{
  const dir=fixture(t),p=readJSON(config(dir)),file=path.join(dir,p.cover.file);
  fs.appendFileSync(file,Buffer.from('new source revision'));
  const built=buildSite(dir);
  const variants=readJSON(path.join(dir,'content/image-variants.json'))[p.cover.file];
  assert.notEqual(variants.hash,hash(fs.readFileSync(file)));
  for(const image of variants.images) assert.ok(!Object.hasOwn(built.files,image.file));
});
