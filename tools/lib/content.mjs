import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readProjectMarkdown } from './project-markdown.mjs';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const writeJSON = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
export function within(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || relative.split('/').some(x => !x || x === '.' || x === '..') || path.isAbsolute(relative) || /[:?#]/.test(relative)) throw new Error(`Unsafe path: ${relative}`);
  const target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error(`Path escapes root: ${relative}`);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${relative}`);
  }
  return target;
}
export function dimensions(file) {
  const data = fs.readFileSync(file);
  if (data.toString('ascii', 1, 4) === 'PNG') return [data.readUInt32BE(16), data.readUInt32BE(20)];
  if (data.toString('ascii', 8, 12) === 'WEBP') {
    const format = data.toString('ascii', 12, 16);
    if (format === 'VP8X') return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
    if (format === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
    if (format === 'VP8L') { const n = data.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >>> 14) & 0x3fff) + 1]; }
  }
  if (data[0] === 255 && data[1] === 216) {
    let offset = 2;
    while (offset < data.length) {
      if (data[offset] !== 255) { offset++; continue; }
      while (data[offset] === 255) offset++;
      const marker = data[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = data.readUInt16BE(offset);
      if (length < 2) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return [data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3)];
      offset += length;
    }
  }
  throw new Error(`Cannot determine image dimensions: ${file}`);
}
export const states = ['draft', 'ready', 'published', 'archived'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (v, label) => { if (typeof v !== 'string' || !v.trim()) throw new Error(`${label} is required`); };
export function validateProject(root, p, complete = p.status !== 'draft' && p.status !== 'archived') {
  for (const key of ['id', 'slug']) if (!slugPattern.test(p[key] ?? '')) throw new Error(`Invalid ${key}: ${p[key]}`);
  if (!states.includes(p.status)) throw new Error(`${p.id}: invalid status`);
  for (const alias of p.aliases ?? []) if (!slugPattern.test(alias)) throw new Error(`${p.id}: invalid alias ${alias}`);
  for (const id of p.legacyIds ?? []) if (!/^\d+$/.test(id)) throw new Error(`${p.id}: invalid legacy ID`);
  if (!complete) return;
  for (const key of ['brand', 'model']) text(p[key], `${p.id}.${key}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.startedAt) || Number.isNaN(Date.parse(p.startedAt)) || new Date(p.startedAt).toISOString().slice(0,10) !== p.startedAt) throw new Error(`${p.id}: invalid startedAt`);
  if (!Array.isArray(p.scope) || !p.scope.length) throw new Error(`${p.id}: scope is required`);
  p.scope.forEach(s => text(s, `${p.id}.scope`));
  if (!Array.isArray(p.images) || !p.images.length) throw new Error(`${p.id}: detail images are required`);
  const seen = new Set();
  for (const item of [p.cover, ...p.images]) {
    const allowedImage = item && (/^assets\/[^/\\:*?"<>|]+\.(png|webp|jpe?g)$/i.test(item.file ?? '') || new RegExp(`^assets/projects/${p.id}/(?:[a-zA-Z0-9_@. -]+/)*[a-zA-Z0-9_@. -]+\\.(png|webp|jpe?g)$`, 'i').test(item.file ?? ''));
    if (!allowedImage) throw new Error(`${p.id}: invalid image path`);
    const file = within(root, item.file);
    text(item.alt, `${p.id}: image alt`);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`${p.id}: missing image ${item.file}`);
    const [w,h] = dimensions(file);
    if (!(w > 0 && h > 0)) throw new Error(`${p.id}: invalid image dimensions`);
  }
  for (const item of p.images) { if (seen.has(item.file)) throw new Error(`${p.id}: duplicate image ${item.file}`); seen.add(item.file); }
}
export function loadContent(root) {
  const site = readJSON(path.join(root, 'content/site.json'));
  for (const key of ['name', 'namePrimary', 'nameSuffix', 'discipline', 'email', 'footerEmail', 'origin', 'lang']) text(site[key], `site.${key}`);
  const origin = new URL(site.origin);
  if (origin.protocol !== 'https:' || origin.origin !== site.origin) throw new Error('site.origin must be an HTTPS origin without a trailing slash');
  if (!/^[^\s<>@]+@[^\s<>@]+$/.test(site.email)) throw new Error('Invalid contact email');
  if (!/^[^\s<>@]+@[^\s<>@]+$/.test(site.footerEmail)) throw new Error('Invalid footer email');
  if (!Array.isArray(site.navigation) || !site.navigation.length) throw new Error('Navigation is required');
  for (const n of site.navigation) { text(n.label,'navigation.label'); if (!/^\/(?:[a-z0-9-]+(?:\.html)?\/?)?$/.test(n.url)) throw new Error('Invalid navigation URL'); }
  const folder = path.join(root, '_projects');
  if (!fs.existsSync(folder)) throw new Error('_projects directory is required');
  const entries = fs.readdirSync(folder, {withFileTypes:true});
  for (const entry of entries) if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) throw new Error(`_projects may only contain Markdown files: ${entry.name}`);
  const projects = entries.map(e => {
    const markdown = `_projects/${e.name}`;
    const p = readProjectMarkdown(root, markdown);
    p.sourceFile = markdown;
    validateProject(root, p);
    return p;
  });
  const routes = new Set(['index','about','news','project','404','assets','content','tools','release','releases']);
  const ids = new Set(), projectIds = new Set();
  for (const p of projects) {
    if (projectIds.has(p.id)) throw new Error(`Duplicate project ID: ${p.id}`);
    projectIds.add(p.id);
    for (const route of [p.slug, ...(p.aliases ?? [])]) {
      if (routes.has(route)) throw new Error(`Duplicate or reserved route: ${route}`);
      routes.add(route);
    }
    for (const id of p.legacyIds ?? []) { if (ids.has(id)) throw new Error(`Duplicate legacy ID: ${id}`); ids.add(id); }
  }
  const pages = Object.fromEntries(['works','about','news','not-found','legacy'].map(name => [name, readJSON(path.join(root, `content/pages/${name}.json`))]));
  for (const [name,p] of Object.entries(pages)) for (const field of ['title','description','heading']) text(p[field], `pages.${name}.${field}`);
  const news = readJSON(path.join(root, 'content/news.json'));
  const newsIds = new Set();
  for (const entry of news) {
    if (!slugPattern.test(entry.id) || newsIds.has(entry.id) || !states.includes(entry.status)) throw new Error(`Invalid/duplicate news entry: ${entry.id}`);
    newsIds.add(entry.id);
    text(entry.label, 'news.label'); text(entry.body, 'news.body');
  }
  return {site, projects: projects.sort((a,b)=>(b.startedAt ?? '').localeCompare(a.startedAt ?? '') || a.id.localeCompare(b.id)), pages, news};
}
