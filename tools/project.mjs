import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,readJSON,writeJSON,within,validateProject,loadContent,states,dimensions} from './lib/content.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const safeId=id=>{if(!/^\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id??'')) throw new Error('Project ID must be YYMMDD-brand-model');return id;};
const projectFile=(workspace,id)=>within(workspace,`content/projects/${safeId(id)}/project.json`);

export function newProject(workspace,id) {
  const file=projectFile(workspace,id);
  if(fs.existsSync(file)) throw new Error(`Project already exists: ${id}`);
  const slug=id.slice(7);
  const p={id,status:'draft',slug,aliases:[],legacyIds:[],startedAt:`20${id.slice(0,2)}-${id.slice(2,4)}-${id.slice(4,6)}`,brand:'',model:'',description:'',scope:[],cover:null,images:[],source:{type:'mastergo',fileTitle:'',page:'网站',url:null,importedAt:null,revision:null}};
  const content=loadContent(workspace);
  if(content.projects.some(p=>p.slug===slug||(p.aliases||[]).includes(slug))) throw new Error(`Route already exists: ${slug}`);
  writeJSON(file,p);
  return p;
}
export function setStatus(workspace,id,status) {
  if(!states.includes(status)) throw new Error(`Status must be one of: ${states.join(', ')}`);
  const file=projectFile(workspace,id),p=readJSON(file);
  const before=p.status;
  p.status=status;
  validateProject(workspace,p);
  if(status==='published'&&before!=='ready'&&before!=='published') throw new Error('Mark this project ready and preview it before marking it published.');
  writeJSON(file,p);
  return {id,before,status};
}
export function importProject(workspace,id,source,{apply=false}={}) {
  const config=projectFile(workspace,id),p=readJSON(config);
  const sourcePath=path.resolve(workspace,source);
  if(!fs.existsSync(sourcePath)||!fs.statSync(sourcePath).isDirectory()||fs.lstatSync(sourcePath).isSymbolicLink()) throw new Error('Source must be a real export directory');
  const entries=fs.readdirSync(sourcePath,{withFileTypes:true});
  const imageEntries=entries.filter(e=>/\.(png|webp|jpe?g)$/i.test(e.name));
  const files=imageEntries.map(e=>{
    if(!e.isFile()||!/^\d{2}(?:@[a-zA-Z0-9_-]+)?\.(png|webp|jpe?g)$/i.test(e.name)) throw new Error(`Invalid export image name: ${e.name}`);
    const file=path.join(sourcePath,e.name),bytes=fs.readFileSync(file);
    dimensions(file);
    return {name:e.name,position:Number(e.name.slice(0,2)),hash:hash(bytes),bytes};
  }).sort((a,b)=>a.position-b.position);
  if(!files.some(f=>f.position===1)) throw new Error('A detail image at position 01 is required; 00 is cover only.');
  if(new Set(files.map(f=>f.position)).size!==files.length) throw new Error('Duplicate image positions in export');
  const revision=hash(JSON.stringify(files.map(({name,hash})=>({name,hash}))));
  const folder=`assets/projects/${id}/imports/${revision}`;
  const old=[...p.images,p.cover].filter(Boolean).filter((v,i,a)=>a.findIndex(x=>x.file===v.file)===i);
  const oldDigest=o=>fs.existsSync(within(workspace,o.file))?hash(fs.readFileSync(within(workspace,o.file))):null;
  const report=[];
  for(const f of files) {
    const same=old.find(o=>path.basename(o.file)===f.name);
    const sameHash=old.find(o=>oldDigest(o)===f.hash);
    report.push({status:same?(oldDigest(same)===f.hash?'unchanged':'updated'):sameHash?'renamed':'new',file:f.name,previous:sameHash?.file??same?.file??null});
  }
  for(const o of old) if(!files.some(f=>f.name===path.basename(o.file))) report.push({status:'removed-from-manifest',file:o.file});
  if(!apply) return {id,revision,applied:false,report};
  // Imports are immutable snapshots. Removed originals remain recoverable locally and are not published.
  for(const f of files) {
    const target=within(workspace,`${folder}/${f.name}`);
    if(fs.existsSync(target)) {if(hash(fs.readFileSync(target))!==f.hash) throw new Error(`Corrupt import snapshot: ${target}`);}
    else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,f.bytes,{flag:'wx'});}
  }
  const asImage=(f,index)=>{
    const previous=old.find(o=>oldDigest(o)===f.hash);
    return {file:`${folder}/${f.name}`,alt:previous?.alt||`${p.brand} ${p.model} — project image ${index+1}`,caption:previous?.caption||''};
  };
  p.cover=asImage(files.find(f=>f.position===0)||files.find(f=>f.position===1),0);
  p.images=files.filter(f=>f.position>0).map(asImage);
  p.source={...p.source,importedAt:new Date().toISOString(),revision};
  validateProject(workspace,p);
  // Write a complete record before replacing the old record; an interrupted copy cannot remove old content.
  const temporary=config+'.incoming';
  writeJSON(temporary,p);
  fs.renameSync(temporary,config);
  writeJSON(within(workspace,`outputs/imports/${id}/${revision}.json`),{id,revision,importedAt:p.source.importedAt,source:sourcePath,report});
  return {id,revision,applied:true,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [command,id,arg,...flags]=process.argv.slice(2);
    let result;
    if(command==='new') result=newProject(root,id);
    else if(command==='status') result=setStatus(root,id,arg);
    else if(command==='import') {
      if(!arg||flags.some(f=>f!=='--apply')) throw new Error('Usage: import <id> <export-folder> [--apply]');
      result=importProject(root,id,arg,{apply:flags.includes('--apply')});
    } else if(command==='list') result=loadContent(root).projects.map(({id,status,slug,model})=>({id,status,slug,model}));
    else throw new Error('Usage: project.mjs new <id> | list | status <id> <draft|ready|published|archived> | import <id> <folder> [--apply]');
    console.log(JSON.stringify(result,null,2));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
