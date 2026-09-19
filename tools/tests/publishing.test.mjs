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
  for(const name of ['_projects','content','assets','site.css','site.js','theme.js','favicon.svg']) fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
  t.after(()=>{if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('portfolio-test-'))throw new Error('Unsafe cleanup');fs.rmSync(dir,{recursive:true,force:true});});
  return dir;
}
const id='210825-colbor-cl60';
const project=dir=>loadContent(dir).projects.find(item=>item.id===id);
const config=dir=>path.join(dir,project(dir).sourceFile);
const replace=(file,pattern,value)=>fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(pattern,value));

test('build is reproducible, preserves legacy routes, and excludes source and unused assets',t=>{
  const dir=fixture(t),first=buildSite(dir),second=buildSite(dir);
  const current=project(dir);
  assert.equal(first.version,second.version);
  const out=path.join(dir,'dist-static');
  assert.equal(first.routes.length,11);
  assert.ok(first.routes.includes(`${current.slug}/index.html`));
  assert.match(fs.readFileSync(path.join(out,'project.html'),'utf8'),/"0":"\/nitecore-hc65-uhe\/"/);
  assert.ok(!fs.existsSync(path.join(out,'content')));
  assert.ok(!fs.existsSync(path.join(out,'assets/hc65-uhe/01-cover.png')));
  verifyArtifact(out);
});
test('all projects are sourced from the flat Markdown collection',t=>{
  const dir=fixture(t),content=loadContent(dir);
  assert.equal(content.projects.length,5);
  assert.ok(content.projects.every(item=>item.contentFormat==='markdown'&&item.sourceFile.startsWith('_projects/')));
  const hc65=content.projects.find(p=>p.id==='240129-nitecore-hc65-uhe');
  assert.equal(hc65.description,'');
  assert.equal(hc65.images.length,6);
  assert.ok(hc65.images.every(image=>/^assets\/[^/]+\.png$/.test(image.file)));
  assert.equal(hc65.cover.file,'assets/01.png');
  buildSite(dir);
  const html=fs.readFileSync(path.join(dir,'dist-static/nitecore-hc65-uhe/index.html'),'utf8');
  assert.match(html,/\/assets\/01\.png/);
  assert.match(html,/class="project-image transparent"/);
  assert.doesNotMatch(html,/content\/projects/);
  assert.ok(!fs.existsSync(path.join(dir,'dist-static/content')));
});
test('About and footer emails follow the site configuration',t=>{
  const dir=fixture(t);buildSite(dir);
  const about=fs.readFileSync(path.join(dir,'dist-static/about.html'),'utf8');
  assert.match(about,/class="footer-contact" href="mailto:hello@willyang\.design">hello@willyang\.design/);
  assert.match(about,/<h2>Contact<\/h2><p><a href="mailto:hello@willyang\.design">hello@willyang\.design<\/a>/);
});
test('drafts, ready items, archives and their unique images never enter production',t=>{
  const dir=fixture(t);
  for(const status of ['draft','ready','archived']) {
    replace(config(dir),/^status:\s*[^\r\n]+/m,`status: ${status}`);const p=project(dir);
    buildSite(dir);
    const out=path.join(dir,'dist-static');
    assert.ok(!fs.existsSync(path.join(out,p.slug)));
    for(const alias of p.aliases??[])assert.ok(!fs.existsSync(path.join(out,alias)));
    for(const image of [p.cover,...p.images]) assert.ok(!fs.existsSync(path.join(out,image.file)));
    const legacyRoutes=fs.readFileSync(path.join(out,'project.html'),'utf8');
    for(const legacyId of p.legacyIds??[])assert.doesNotMatch(legacyRoutes,new RegExp(`"${legacyId}":`));
  }
});
test('failed validation preserves the previous release; duplicates and bad paths fail clearly',t=>{
  const dir=fixture(t),before=buildSite(dir),file=config(dir),original=fs.readFileSync(file,'utf8');
  const firstImage=path.basename(project(dir).images[0].file);
  for(const mutate of [
    source=>source.replace(`![[${firstImage}]]`,'![[missing.png]]'),
    source=>source.replace(/^slug:.*$/m,'slug: about'),
    source=>source.replace(`![[${firstImage}]]`,'![[../package.png]]'),
    source=>source.replace(/^date:.*$/m,'date: 2024-02-30')
  ]) {
    fs.writeFileSync(file,mutate(original));
    assert.throws(()=>buildSite(dir));
    assert.equal(verifyArtifact(path.join(dir,'dist-static')).version,before.version);
  }
});
test('removing an image or archiving a project cleans repeated builds while retaining local originals',t=>{
  const dir=fixture(t);buildSite(dir);
  const p=project(dir),removed=p.images.at(-1),file=config(dir);
  replace(file,`![[${path.basename(removed.file)}]]`,'');buildSite(dir);
  assert.ok(!fs.existsSync(path.join(dir,'dist-static',removed.file)));
  assert.ok(fs.existsSync(path.join(dir,removed.file)));
  setStatus(dir,id,'archived');buildSite(dir);
  assert.ok(!fs.existsSync(path.join(dir,'dist-static',p.slug,'index.html')));
});
test('new → import preview → apply → ready → preview → published works without editing templates',t=>{
  const dir=fixture(t),newId='260918-test-product';
  const created=newProject(dir,newId),file=path.join(dir,created.sourceFile);
  replace(file,/^brand:.*$/m,'brand: TEST');replace(file,/^model:.*$/m,'model: Product');replace(file,'scope: []','scope:\n  - Industrial design');replace(file,'Add the project introduction here.','Test description');
  const source=path.join(dir,'exports');fs.mkdirSync(source);
  const image=project(dir).images[0].file;
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
  const original=project(dir),first=original.images[0];
  fs.copyFileSync(path.join(dir,first.file),path.join(source,'01.png'));
  fs.copyFileSync(path.join(dir,first.file),path.join(source,'01@1x.png'));
  assert.throws(()=>importProject(dir,id,source,{apply:true}),/Duplicate/);
  fs.unlinkSync(path.join(source,'01@1x.png'));
  const report=importProject(dir,id,source,{apply:true});
  assert.ok(report.report.some(r=>r.status==='removed-from-manifest'));
  const updated=project(dir);assert.equal(updated.images.length,1);assert.equal(updated.images[0].caption,first.caption);
  assert.ok(original.images.every(i=>fs.existsSync(path.join(dir,i.file))));
  buildSite(dir);assert.ok(!fs.existsSync(path.join(dir,'dist-static',original.images[1].file)));
});
test('release rollback restores exact bytes and rejects tampering and extra files',t=>{
  const dir=fixture(t);buildSite(dir);const version=saveRelease(dir);
  replace(config(dir),/\r?\n---\r?\n(?=!\[\[)/,'\n---\n\nChanged copy\n\n');
  assert.notEqual(buildSite(dir).version,version);
  assert.equal(restoreRelease(dir,version).version,version);
  assert.equal(project(dir).description,'Changed copy');
  fs.writeFileSync(path.join(dir,'dist-static/unexpected.txt'),'private');
  assert.throws(()=>verifyArtifact(path.join(dir,'dist-static')),/unexpected/);
  fs.appendFileSync(path.join(dir,`releases/${version}/index.html`),'tampered');
  assert.throws(()=>restoreRelease(dir,version),/checksum/);
});
test('stale responsive variants fall back to originals and are not copied',t=>{
  const dir=fixture(t),p=project(dir),file=path.join(dir,p.cover.file);
  fs.appendFileSync(file,Buffer.from('new source revision'));
  const built=buildSite(dir);
  const variants=readJSON(path.join(dir,'content/image-variants.json'))[p.cover.file];
  assert.notEqual(variants.hash,hash(fs.readFileSync(file)));
  for(const image of variants.images) assert.ok(!Object.hasOwn(built.files,image.file));
});
