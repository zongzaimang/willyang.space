// Optional asset preparation: pass an installed sharp module path as argument 1.
// Originals remain untouched; the normal build has no external dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {default:sharp}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:'sharp');
const manifest={};
const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(folder,entry.name)):[path.join(folder,entry.name)]);
const files=walk(path.join(root,'assets')).filter(file=>!file.includes(`${path.sep}responsive${path.sep}`)&&(/-alpha\.png$/.test(file)||/assets[\\/]projects[\\/].+\.(jpg|webp|png)$/i.test(file)));
let total=0;
for(const file of files){
  const key=path.relative(root,file).replaceAll('\\','/');
  const metadata=await sharp(file).metadata();
  const name=key.replace(/^assets\//,'').replace(/\.[^.]+$/,'').replaceAll('/','--');
  const images=[];
  for(const width of [...new Set([480,960,1600,metadata.width].filter(w=>w<=metadata.width))].sort((a,b)=>a-b)){
    const output=`assets/responsive/${name}-${width}.webp`;
    fs.mkdirSync(path.dirname(path.join(root,output)),{recursive:true});
    await sharp(file).resize({width,withoutEnlargement:true}).webp({quality:88,alphaQuality:100,effort:4}).toFile(path.join(root,output));
    images.push({file:output,width}); total++;
  }
  manifest[key]={hash:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),images};
}
fs.writeFileSync(path.join(root,'content/image-variants.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${total} responsive images from ${files.length} originals.`);
