import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {within} from './lib/content.mjs';
const workspace=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(workspace,process.argv.includes('--preview')?'dist-preview':'dist-static');
if(!fs.existsSync(path.join(root,'release.json'))) throw new Error('Build the site before starting preview.');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(403);res.end();return;}
    const relative=pathname==='/'?'index.html':pathname.slice(1)+(pathname.endsWith('/')?'index.html':'');
    const file=within(root,relative);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:fs.readFileSync(path.join(root,'404.html')));return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    if(req.method==='HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Preview ${path.basename(root)}: http://127.0.0.1:${process.env.PORT||4173}`));
