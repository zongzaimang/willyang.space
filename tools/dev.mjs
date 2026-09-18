import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {buildSite,root} from './build-site.mjs';
import {optimizeImages} from './optimize-images.mjs';

const preview=process.argv.includes('--preview');
let rebuilding=false,queued=false,timer;

async function rebuild(reason,{images=false}={}) {
  if(rebuilding){queued=true;return;}
  rebuilding=true;
  try {
    if(images)await optimizeImages(root,sharp);
    const release=buildSite(root,{preview});
    console.log(`[content] ${reason}: built ${release.routes.length} routes (${release.version})`);
  } catch(error) {
    console.error(`[content] ${reason}: ${error.message}`);
    console.error('[content] Previous successful preview remains available.');
  } finally {
    rebuilding=false;
    if(queued){queued=false;void rebuild('queued changes',{images:true});}
  }
}

await rebuild('initial build',{images:true});
const server=spawn(process.execPath,[path.join(root,'tools/serve-site.mjs'),...(preview?['--preview']:[])],{stdio:'inherit'});
const watchers=[];
const schedule=(relative,images)=>{
  clearTimeout(timer);
  timer=setTimeout(()=>void rebuild(relative,{images}),250);
};
for(const relative of ['_projects','assets','content/pages']) {
  const folder=path.join(root,relative);
  watchers.push(fs.watch(folder,{recursive:true},(_event,name)=>{
    if(relative==='assets'&&String(name??'').replaceAll('\\','/').startsWith('responsive/'))return;
    schedule(`${relative}/${name??''}`,relative!=='content/pages');
  }));
}
for(const relative of ['content/site.json','content/news.json','site.css','site.js','theme.js','favicon.svg']) {
  const file=path.join(root,relative);
  fs.watchFile(file,{interval:500},()=>schedule(relative,false));
}
console.log(`[content] Watching _projects and project assets. Obsidian workspace state is excluded.`);

function close() {
  clearTimeout(timer);
  for(const watcher of watchers)watcher.close();
  for(const relative of ['content/site.json','content/news.json','site.css','site.js','theme.js','favicon.svg'])fs.unwatchFile(path.join(root,relative));
  server.kill();
}
process.on('SIGINT',()=>{close();process.exit(0);});
process.on('SIGTERM',()=>{close();process.exit(0);});
server.on('exit',code=>{close();process.exitCode=code??0;});
