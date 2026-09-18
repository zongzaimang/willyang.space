import fs from 'node:fs';
import path from 'node:path';
import {hash,readJSON,within,writeJSON} from './content.mjs';

export function walk(root, prefix = '') {
  return fs.readdirSync(path.join(root,prefix), {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{
    const relative = prefix ? `${prefix}/${e.name}` : e.name;
    within(root,relative);
    return e.isDirectory() ? walk(root,relative) : [relative];
  });
}
export function sealArtifact(folder, metadata) {
  const files=Object.fromEntries(walk(folder).filter(f=>f!=='release.json').map(f=>[f,hash(fs.readFileSync(within(folder,f)))]));
  const version=hash(JSON.stringify(files)).slice(0,20);
  writeJSON(path.join(folder,'release.json'),{format:1,version,...metadata,files});
  return version;
}
export function verifyArtifact(folder) {
  const release=readJSON(path.join(folder,'release.json'));
  if(release.format!==1 || !release.files || !Array.isArray(release.routes)) throw new Error('Invalid release manifest');
  const actual=walk(folder).filter(f=>f!=='release.json');
  if(JSON.stringify(actual.sort())!==JSON.stringify(Object.keys(release.files).sort())) throw new Error('Artifact contains missing or unexpected files');
  for(const [file,digest] of Object.entries(release.files)) {
    if(hash(fs.readFileSync(within(folder,file)))!==digest) throw new Error(`Artifact checksum mismatch: ${file}`);
  }
  if(hash(JSON.stringify(release.files)).slice(0,20)!==release.version) throw new Error('Invalid release version');
  for(const file of actual.filter(f=>f.endsWith('.html'))) {
    const html=fs.readFileSync(within(folder,file),'utf8');
    const links=[...html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)].map(m=>m[1]);
    for(const m of html.matchAll(/srcset="([^"]*)"/g)) links.push(...m[1].split(',').map(s=>s.trim().split(/\s+/)[0]));
    for(const link of links) {
      const relative=decodeURIComponent(link).replace(/^\//,'') || 'index.html';
      const target=within(folder,relative.endsWith('/')?`${relative}index.html`:relative);
      if(!fs.existsSync(target)||!fs.statSync(target).isFile()) throw new Error(`Broken link in ${file}: ${link}`);
    }
  }
  for(const route of release.routes) if(!Object.hasOwn(release.files,route)) throw new Error(`Missing route: ${route}`);
  return release;
}
// Only these generated directories can be replaced. Source and archive folders are never removed.
export function replaceOutput(root, name, populate) {
  if(!['dist-static','dist-preview'].includes(name)) throw new Error(`Unsupported output: ${name}`);
  const target=within(root,name), stage=within(root,`${name}.building`), old=within(root,`${name}.previous`);
  if(fs.existsSync(stage)||fs.existsSync(old)) throw new Error(`Interrupted build detected; inspect ${stage} and ${old} before retrying`);
  fs.mkdirSync(stage);
  try {
    populate(stage);
    verifyArtifact(stage);
    if(fs.existsSync(target)) fs.renameSync(target,old);
    try { fs.renameSync(stage,target); }
    catch(error) { if(fs.existsSync(old)) fs.renameSync(old,target); throw error; }
    if(fs.existsSync(old)) fs.rmSync(old,{recursive:true});
  } catch(error) {
    if(fs.existsSync(stage)) fs.rmSync(stage,{recursive:true});
    throw error;
  }
  return verifyArtifact(target);
}
