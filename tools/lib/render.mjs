import {dimensions,within} from './content.mjs';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function render(root,{site,projects,pages,news},variants) {
const outputs=new Map();
const mediaClass=file=>/\.png$/i.test(file)||file.includes('-alpha')?'transparent':'photo';
function image(file,alt,{cover=false,priority=false,sourceFile=file}={}) {
  const [width,height]=dimensions(within(root,sourceFile));
  const sizes=cover?'(max-width: 540px) 92vw, (max-width: 1100px) 44vw, (max-width: 1600px) 29vw, 460px':'(max-width: 1600px) 91vw, 1440px';
  const entry=variants[file];
  const valid=Boolean(entry);
  const responsive=valid?` srcset="${entry.images.map(v=>`/${v.file} ${v.width}w`).join(', ')}" sizes="${sizes}"`:'';
  return `<img src="/${escape(file)}"${responsive} width="${width}" height="${height}" alt="${escape(alt)}" loading="${priority?'eager':'lazy'}"${priority?' fetchpriority="high"':''} decoding="async">`;
}
function navigation(active,footer=false){return `<nav class="${footer?'footer-nav':'nav'}" aria-label="${footer?'Footer':'Main'}">${site.navigation.map(({label,url})=>`<a href="${escape(url)}"${label===active?' aria-current="page"':''}>${escape(label)}</a>`).join('')}</nav>`;}
function header(active){return `<a class="skip-link" href="#main">Skip to content</a><header class="header"><div class="header-inner wrap"><a class="name" href="/index.html" aria-label="${escape(site.name)} home">${escape(site.namePrimary)} <span>${escape(site.nameSuffix)}</span></a><div class="header-tools">${navigation(active)}<button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to dark theme" aria-pressed="false" title="Switch to dark theme"><svg class="theme-icon theme-icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z"/></svg><svg class="theme-icon theme-icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.2v2M12 19.8v2M2.2 12h2M19.8 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4"/></svg></button></div></div></header>`;}
function footer(active){return `<footer class="site-footer"><div class="wrap"><div class="footer-top"><div><p class="eyebrow">Contact</p><a class="footer-contact" href="mailto:${escape(site.footerEmail)}">${escape(site.footerEmail)} <span aria-hidden="true">↗</span></a></div>${navigation(active,true)}</div><div class="footer-bottom"><p>© ${new Date().getFullYear()} ${escape(site.name)}</p><p>${escape(site.discipline)}</p></div></div></footer>`;}
function page({title,description,url,active,body,extra='',lang=site.lang}){return `<!doctype html>
<html lang="${escape(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — ${escape(site.name)}</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#ffffff"><meta name="color-scheme" content="light dark"><link rel="canonical" href="${escape(site.origin)}${url}"><meta property="og:title" content="${escape(title)} — ${escape(site.name)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(site.origin)}${url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><script src="/theme.js"></script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="/site.css"><script src="/site.js" defer></script>${extra}</head><body>${header(active)}${body}${footer(active)}</body></html>\n`;}
function write(file,content){outputs.set(file,content);}

const cards=projects.map((p,index)=>{
  const cover=p.cover.file;
  return `<a class="card" href="/${p.slug}/"><div class="image ${mediaClass(cover)}">${image(cover,p.cover.alt,{cover:true,priority:index===0,sourceFile:p.cover.sourceFile})}<span class="card-mark" aria-hidden="true">↗</span></div><div class="label"><h2>${escape(p.model)}</h2><time datetime="${p.startedAt}">${p.startedAt.slice(0,4)}</time><p>${escape(p.brand)}</p></div></a>`;
}).join('\n');
write('index.html',page({title:pages.works.title,description:pages.works.description,url:'/',active:'Works',body:`<main id="main" class="wrap" tabindex="-1"><div class="work-heading"><h1>${escape(pages.works.heading)}</h1><p class="eyebrow">${escape(site.discipline)} · ${projects.length} projects</p></div><section class="gallery" aria-label="Selected projects">${cards}</section></main>`}));

for (const [index,p] of projects.entries()) {
  const files=p.images;
  const next=projects[(index+1)%projects.length];
  const description=p.description||'';
  const pageDescription=description||`${p.model} project by ${p.brand}.`;
  const picture=({file,sourceFile,alt,caption},i)=>`<figure class="project-image ${mediaClass(file)}"><a href="/${escape(file)}" data-view-image aria-label="Enlarge ${escape(p.model)} image ${i+1}">${image(file,alt,{priority:i===0,sourceFile})}</a>${caption?`<figcaption>${escape(caption)}</figcaption>`:''}</figure>`;
  let imageIndex=0;
  const projectContent=p.bodyBlocks?p.bodyBlocks.map(block=>{
    if(block.type==='image')return picture(block.image,imageIndex++);
    if(block.type==='heading')return `<h${block.depth} class="project-subheading">${escape(block.text)}</h${block.depth}>`;
    if(block.type==='paragraph')return `<p class="project-copy">${block.html}</p>`;
    if(block.type==='list'){const tag=block.ordered?'ol':'ul';return `<${tag} class="project-list">${block.items.map(item=>`<li>${escape(item)}</li>`).join('')}</${tag}>`;}
    throw new Error(`Unsupported project block: ${block.type}`);
  }).join('\n'):files.map(picture).join('\n');
  const body=`<main id="main" class="project-main wrap" tabindex="-1"><div class="project-heading${description?'':' project-heading--solo'}"><div><a class="back-link" href="/index.html"><span aria-hidden="true">←</span> All works</a><p class="eyebrow">${escape(p.brand)} / ${p.startedAt.slice(0,4)}</p><h1>${escape(p.model)}</h1></div>${description?`<p class="intro">${escape(description)}</p>`:''}</div><dl class="project-meta"><div><dt>Client</dt><dd>${escape(p.brand)}</dd></div><div><dt>Scope</dt><dd>${p.scope.map(escape).join('<br>')}</dd></div><div><dt>Year</dt><dd>${p.startedAt.slice(0,4)}</dd></div></dl><section class="project-content" aria-label="${escape(p.model)} project content">${projectContent}</section><a class="next-project" href="/${next.slug}/"><span><small>Next project / ${escape(next.brand)}</small><strong>${escape(next.model)}</strong></span><span aria-hidden="true">↗</span></a></main><dialog class="viewer" id="image-viewer" aria-labelledby="viewer-title"><div class="viewer-toolbar"><p id="viewer-title">Project image</p><div class="viewer-actions"><button class="viewer-zoom" type="button" aria-pressed="false">Original size</button><button class="viewer-close" type="button" aria-label="Close image viewer">×</button></div></div><div class="viewer-stage"><img alt=""></div></dialog>`;
  write(`${p.slug}/index.html`,page({title:p.model,description:pageDescription,url:`/${p.slug}/`,active:'Works',body}));
}
write('about.html',page({title:pages.about.title,description:pages.about.description,url:'/about.html',active:'About',body:`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">About</p><h1 class="page-title about-title">${escape(pages.about.heading)}</h1><section class="details" aria-label="Studio information"><div><h2>Focus</h2><p>${escape(pages.about.focus)}</p></div><div><h2>Contact</h2><p><a href="mailto:${escape(site.email)}">${escape(site.email)}</a><br>${escape(pages.about.availability)}</p></div></section></main>`}));
write('news.html',page({title:pages.news.title,description:pages.news.description,url:'/news.html',active:'News',body:`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">News</p><h1 class="page-title">${escape(pages.news.heading)}</h1><section class="updates" aria-label="Studio updates">${news.map(n=>`<article class="update"><span class="date">${escape(n.label)}</span><p lang="${escape(n.lang || site.lang)}">${escape(n.body)}</p></article>`).join('')}</section></main>`}));
const missing=`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">404</p><h1 class="page-title">${escape(pages['not-found'].heading)}</h1><p class="error-copy">${escape(pages['not-found'].body)}</p><a class="button" href="/index.html">View works</a></main>`;
write('404.html',page({title:pages['not-found'].title,description:pages['not-found'].description,url:'/404.html',body:missing}));
const routes=Object.fromEntries(projects.flatMap(p=>(p.legacyIds||[]).map(id=>[id,`/${p.slug}/`])));
write('project.html',page({title:pages.legacy.title,description:pages.legacy.description,url:'/project.html',active:'Works',extra:`<script>const routes=${JSON.stringify(routes)};const id=new URLSearchParams(location.search).get('id');if(Object.hasOwn(routes,id))location.replace(routes[id]);</script>`,body:`<main id="main" class="text-main wrap" tabindex="-1"><p class="eyebrow">Works</p><h1 class="page-title">${escape(pages.legacy.heading)}</h1><p class="error-copy">${escape(pages.legacy.body)}</p><a class="button" href="/index.html">View works</a></main>`}));
for(const p of projects) for(const alias of p.aliases||[]) write(`${alias}/index.html`, `<!doctype html><html lang="${escape(site.lang)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(p.model)} — ${escape(site.name)}</title><meta http-equiv="refresh" content="0; url=/${p.slug}/"><link rel="canonical" href="${site.origin}/${p.slug}/"><a href="/${p.slug}/">View ${escape(p.model)}</a></html>`);
return outputs;
}
