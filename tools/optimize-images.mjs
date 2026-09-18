import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {root} from './build-site.mjs';
import {hash,loadContent,readJSON,writeJSON,within} from './lib/content.mjs';
export async function optimizeImages(workspace,sharp) {
const manifestPath=path.join(workspace,'content/image-variants.json');
const manifest=fs.existsSync(manifestPath)?readJSON(manifestPath):{};
const content=loadContent(workspace);
const files=new Set(content.projects.filter(p=>p.status!=='archived').flatMap(p=>[p.cover?.file,...p.images.map(i=>i.file)]).filter(Boolean));
for(const file of Object.keys(manifest))if(!files.has(file))delete manifest[file];
let generated=0;
for(const file of files) {
  const full=within(workspace,file),digest=hash(fs.readFileSync(full));
  const old=manifest[file];
  if(old?.hash===digest&&old.images?.length&&old.images.every(i=>fs.existsSync(within(workspace,i.file)))) continue;
  const metadata=await sharp(full).metadata();
  const images=[];
  for(const width of [...new Set([480,960,1600,metadata.width].filter(w=>w<=metadata.width))].sort((a,b)=>a-b)) {
    const output=`assets/responsive/${digest}-${width}.webp`;
    const target=within(workspace,output);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    await sharp(full).resize({width,withoutEnlargement:true}).webp({quality:88,alphaQuality:100,effort:4}).toFile(target);
    images.push({file:output,width});generated++;
  }
  manifest[file]={hash:digest,images};
}
writeJSON(manifestPath,manifest);
return {generated,checked:files.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  // An explicit module path is retained for portable/offline installations.
  const {default:sharp}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:'sharp');
  const result=await optimizeImages(root,sharp);
  console.log(`Prepared ${result.generated} responsive images; checked ${result.checked} referenced originals. Unreferenced assets are excluded during build.`);
}
