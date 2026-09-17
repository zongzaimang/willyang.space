import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const projects = JSON.parse(read('content/projects.json')).sort((a,b) => b.startedAt.localeCompare(a.startedAt));
const variants = fs.existsSync(path.join(root, 'content/image-variants.json')) ? JSON.parse(read('content/image-variants.json')) : {};
// Read intrinsic dimensions without a build-time imaging dependency.
function dimensions(file) {
  const data = read(file);
  if (data.toString('ascii',1,4) === 'PNG') return [data.readUInt32BE(16),data.readUInt32BE(20)];
  if (data.toString('ascii',8,12) === 'WEBP') {
    const format = data.toString('ascii',12,16);
    if (format === 'VP8X') return [data.readUIntLE(24,3)+1,data.readUIntLE(27,3)+1];
    if (format === 'VP8 ') return [data.readUInt16LE(26)&0x3fff,data.readUInt16LE(28)&0x3fff];
    if (format === 'VP8L') { const n=data.readUInt32LE(21); return [(n&0x3fff)+1,((n>>>14)&0x3fff)+1]; }
  }
  if (data[0] === 255 && data[1] === 216) {
    let offset=2;
    while(offset<data.length) {
      if(data[offset]!==255){offset++;continue;}
      while(data[offset]===255)offset++;
      const marker=data[offset++];
      if(marker===0xd9||marker===0xda)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      const length=data.readUInt16BE(offset);
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return [data.readUInt16BE(offset+5),data.readUInt16BE(offset+3)];
      offset+=length;
    }
  }
  throw new Error(`Cannot determine image dimensions: ${file}`);
}
function assets(project) {
  const folder=path.join(root,project.assetPath);
  if(fs.existsSync(folder))return fs.readdirSync(folder).filter(file=>/^\d{2}(?:@[^.]+)?\.(png|webp|jpe?g)$/i.test(file)).sort().map(file=>`${project.assetPath}/${file}`);
  if(project.detailId==='0')return ['01-cover','02-render','03-detail','04-angle','05-process','06-final'].map(name=>`assets/hc65-uhe/${name}-alpha.png`);
  throw new Error(`Missing assets for ${project.id}`);
}
function image(file,alt,{cover=false,priority=false}={}) {
  const [width,height]=dimensions(file);
  const sizes=cover?'(max-width: 540px) 92vw, (max-width: 1100px) 44vw, (max-width: 1600px) 29vw, 460px':'(max-width: 1600px) 91vw, 1440px';
  const entry=variants[file];
  const valid=entry && entry.hash===createHash('sha256').update(read(file)).digest('hex');
  const responsive=valid?` srcset="${entry.images.map(v=>`/${v.file} ${v.width}w`).join(', ')}" sizes="${sizes}"`:'';
  return `<img src="/${escape(file)}"${responsive} width="${width}" height="${height}" alt="${escape(alt)}" loading="${priority?'eager':'lazy'}"${priority?' fetchpriority="high"':''} decoding="async">`;
}
function navigation(active,footer=false){return `<nav class="${footer?'footer-nav':'nav'}" aria-label="${footer?'Footer':'Main'}">${[['Works','/index.html'],['News','/news.html'],['About','/about.html']].map(([label,url])=>`<a href="${url}"${label===active?' aria-current="page"':''}>${label}</a>`).join('')}</nav>`;}
function header(active){return `<a class="skip-link" href="#main">Skip to content</a><header class="header"><div class="header-inner wrap"><a class="name" href="/index.html" aria-label="Will Yang Studio home">Will Yang <span>Studio</span></a><div class="header-tools">${navigation(active)}<label class="theme-control" for="theme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/></svg><select id="theme" aria-label="Color theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div></div></header>`;}
function footer(active){return `<footer class="site-footer"><div class="wrap"><div class="footer-top"><div><p class="eyebrow">Contact</p><a class="footer-contact" href="mailto:hello@wenyang.design">hello@wenyang.design <span aria-hidden="true">↗</span></a></div>${navigation(active,true)}</div><div class="footer-bottom"><p>© ${new Date().getFullYear()} Will Yang Studio</p><p>Industrial design</p></div></div></footer>`;}
function page({title,description,url,active,body,extra='',lang='en'}){return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Will Yang Studio</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#ffffff"><meta name="color-scheme" content="light dark"><link rel="canonical" href="https://willyang.space${url}"><meta property="og:title" content="${escape(title)} — Will Yang Studio"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="https://willyang.space${url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><script src="/theme.js"></script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="/site.css"><script src="/site.js" defer></script>${extra}</head><body>${header(active)}${body}${footer(active)}</body></html>\n`;}
function write(file,content){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),content);}

const cards=projects.map((p,index)=>{
  const files=assets(p),cover=files.find(file=>path.basename(file)===p.cover)||files[0];
  return `<a class="card" href="/${p.slug}/"><div class="image ${cover.includes('-alpha')?'':'photo'}">${image(cover,`${p.brand} ${p.model}`,{cover:true,priority:index===0})}<span class="card-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="card-mark" aria-hidden="true">↗</span></div><div class="label"><h2>${escape(p.model)}</h2><time datetime="${p.startedAt}">${p.startedAt.slice(0,4)}</time><p>${escape(p.brand)}</p></div></a>`;
}).join('\n');
write('index.html',page({title:'Works',description:'Selected industrial design projects by Will Yang Studio.',url:'/',active:'Works',body:`<main id="main" class="wrap" tabindex="-1"><div class="work-heading"><h1>Selected works.</h1><p class="eyebrow">Industrial design · ${projects.length} projects</p></div><section class="gallery" aria-label="Selected projects">${cards}</section></main>`}));

for (const [index,p] of projects.entries()) {
  const files=assets(p).filter(file=>!path.basename(file).startsWith('00'));
  const next=projects[(index+1)%projects.length];
  const description=p.detailId==='0'?'HC65 UHE is a headlamp project developed for NITECORE.':`${p.model} is a project developed for ${p.brand}.`;
  const pictures=files.map((file,i)=>`<figure class="project-image ${file.includes('-alpha')?'':'photo'}"><a href="/${escape(file)}" data-view-image aria-label="Enlarge ${escape(p.model)} image ${i+1}">${image(file,`${p.brand} ${p.model} — ${i===0?'project overview':`project image ${i+1}`}`,{priority:i===0})}</a>${i===0?'<figcaption>Select an image to view it larger.</figcaption>':''}</figure>`).join('\n');
  const body=`<main id="main" class="project-main wrap" tabindex="-1"><div class="project-heading"><div><a class="back-link" href="/index.html"><span aria-hidden="true">←</span> All works</a><p class="eyebrow">${escape(p.brand)} / ${p.startedAt.slice(0,4)}</p><h1>${escape(p.model)}</h1></div><p class="intro">${escape(description)}</p></div><dl class="project-meta"><div><dt>Client</dt><dd>${escape(p.brand)}</dd></div><div><dt>Scope</dt><dd>Industrial design<br>CMF direction<br>Production development</dd></div><div><dt>Year</dt><dd>${p.startedAt.slice(0,4)}</dd></div></dl><section aria-label="${escape(p.model)} project images">${pictures}</section><a class="next-project" href="/${next.slug}/"><span><small>Next project / ${escape(next.brand)}</small><strong>${escape(next.model)}</strong></span><span aria-hidden="true">↗</span></a></main><dialog class="viewer" id="image-viewer" aria-labelledby="viewer-title"><div class="viewer-toolbar"><p id="viewer-title">Project image</p><div class="viewer-actions"><button class="viewer-zoom" type="button" aria-pressed="false">Original size</button><button class="viewer-close" type="button" aria-label="Close image viewer">×</button></div></div><div class="viewer-stage"><img alt=""></div></dialog>`;
  write(`${p.slug}/index.html`,page({title:p.model,description,url:`/${p.slug}/`,active:'Works',body}));
}
write('about.html',page({title:'About',description:'Will Yang Studio is an industrial design practice focused on thoughtful, manufacturable products.',url:'/about.html',active:'About',body:`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">About</p><h1 class="page-title about-title">Will Yang Studio is an industrial design practice focused on turning ambiguous needs into thoughtful, manufacturable products.</h1><section class="details" aria-label="Studio information"><div><h2>Focus</h2><p>Product design, with selected branding and packaging projects.</p></div><div><h2>Contact</h2><p><a href="mailto:hello@wenyang.design">hello@wenyang.design</a><br>Available for selected collaborations.</p></div></section></main>`}));
write('news.html',page({title:'News',description:'Design notes and updates from Will Yang Studio.',url:'/news.html',active:'News',body:`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">News</p><h1 class="page-title">Notes from the studio.</h1><section class="updates" aria-label="Studio updates"><article class="update"><span class="date">Coming soon</span><p lang="zh-CN">新项目、展览、合作与制作过程会在这里更新。</p></article><article class="update"><span class="date">Archive</span><p lang="zh-CN">正在整理 Will Yang Studio 的设计记录。</p></article></section></main>`}));
const missing=`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">404</p><h1 class="page-title">Page not found.</h1><p class="error-copy">This page may have moved. Explore the selected projects or get in touch.</p><a class="button" href="/index.html">View works</a></main>`;
write('404.html',page({title:'Page not found',description:'Return to the selected works by Will Yang Studio.',url:'/404.html',body:missing}));
const routes=Object.fromEntries(projects.map(p=>[p.detailId,`/${p.slug}/`]));
write('project.html',page({title:'Projects',description:'Explore projects by Will Yang Studio.',url:'/project.html',active:'Works',extra:`<script>const routes=${JSON.stringify(routes)};const id=new URLSearchParams(location.search).get('id');if(Object.hasOwn(routes,id))location.replace(routes[id]);</script>`,body:`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">Works</p><h1 class="page-title">Explore the projects.</h1><p class="error-copy">Choose a project from the selected works.</p><a class="button" href="/index.html">View works</a></main>`}));
write('240129-nitecore-hc65-uhe/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HC65 UHE — Will Yang Studio</title><meta http-equiv="refresh" content="0; url=/nitecore-hc65-uhe/"><link rel="canonical" href="https://willyang.space/nitecore-hc65-uhe/"><a href="/nitecore-hc65-uhe/">View HC65 UHE</a></html>');
const routesOut=['index.html','about.html','news.html','project.html','404.html',...projects.map(p=>p.slug),'240129-nitecore-hc65-uhe'];
if(process.argv.includes('--dist')) {
  const target=path.join(root,'dist-static');
  fs.mkdirSync(target,{recursive:true});
  for(const file of [...routesOut,'site.css','site.js','theme.js','favicon.svg','CNAME','assets'])fs.cpSync(path.join(root,file),path.join(target,file),{recursive:true});
  fs.writeFileSync(path.join(target,'.nojekyll'),'');
  console.log(`Built ${routesOut.length} static routes into dist-static.`);
} else console.log(`Generated ${routesOut.length} static routes.`);
