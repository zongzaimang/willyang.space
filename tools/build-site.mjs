import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadContent,hash,readJSON,within,validateProject,dimensions} from './lib/content.mjs';
import {render} from './lib/render.mjs';
import {replaceOutput,sealArtifact} from './lib/artifact.mjs';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildSite(workspace=root,{preview=false}={}) {
  const content=loadContent(workspace);
  content.projects=content.projects.filter(p=>p.status==='published'||(preview && ['draft','ready'].includes(p.status)));
  content.news=content.news.filter(n=>n.status==='published'||(preview&&['draft','ready'].includes(n.status)));
  content.projects.forEach(p=>validateProject(workspace,p,true));
  const sources=new Set(content.projects.flatMap(p=>[p.cover.file,...p.images.map(i=>i.file)]));
  const variantFile=path.join(workspace,'content/image-variants.json');
  const registry=fs.existsSync(variantFile)?readJSON(variantFile):{};
  const variants={};
  for(const file of sources) {
    const entry=registry[file];
    if(!entry || entry.hash!==hash(fs.readFileSync(within(workspace,file)))) continue;
    if(!Array.isArray(entry.images)||!entry.images.length) continue;
    const valid=entry.images.every(v=>{
      if(!/^assets\/responsive\/[a-zA-Z0-9_@./-]+\.webp$/.test(v.file)) throw new Error(`Unsafe responsive image: ${v.file}`);
      const full=within(workspace,v.file);
      return Number.isInteger(v.width)&&v.width>0&&fs.existsSync(full)&&dimensions(full)[0]===v.width;
    });
    if(valid) variants[file]=entry;
  }
  const output=render(workspace,content,variants);
  if(preview) for(const [file,html] of output) output.set(file,html.replace('<head>','<head><meta name="robots" content="noindex,nofollow">'));
  const assets=new Set([...sources,...Object.values(variants).flatMap(v=>v.images.map(i=>i.file))]);
  const release=replaceOutput(workspace,preview?'dist-preview':'dist-static',folder=>{
    for(const [file,html] of output) { const target=within(folder,file); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,html); }
    for(const file of ['site.css','site.js','theme.js','favicon.svg',...assets]) {
      const target=within(folder,file); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(within(workspace,file),target);
    }
    fs.writeFileSync(path.join(folder,'CNAME'),new URL(content.site.origin).hostname+'\n');
    fs.writeFileSync(path.join(folder,'.nojekyll'),'');
    sealArtifact(folder,{preview,sourceCommit:process.env.GITHUB_SHA||null,routes:[...output.keys()].sort()});
  });
  return release;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.some(a=>!['--dist','--preview'].includes(a))) throw new Error('Usage: node tools/build-site.mjs [--preview]');
    const result=buildSite(root,{preview:args.includes('--preview')});
    console.log(`Built ${result.routes.length} routes; release ${result.version}; ${result.preview?'dist-preview (not publishable)':'dist-static'}.`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
