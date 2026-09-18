import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { parse as parseYAML } from 'yaml';

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function plainText(tokens = []) {
  return tokens.map(token => {
    if (['text', 'escape', 'codespan'].includes(token.type)) return token.text;
    if (token.tokens) return plainText(token.tokens);
    return '';
  }).join('').trim();
}

function inlineHTML(tokens = []) {
  return tokens.map(token => {
    if (['text', 'escape'].includes(token.type)) return escape(token.text);
    if (token.type === 'codespan') return `<code>${escape(token.text)}</code>`;
    if (token.type === 'strong') return `<strong>${inlineHTML(token.tokens)}</strong>`;
    if (token.type === 'em') return `<em>${inlineHTML(token.tokens)}</em>`;
    if (token.type === 'del') return `<del>${inlineHTML(token.tokens)}</del>`;
    if (token.type === 'br') return '<br>';
    if (token.type === 'link') {
      if (!/^(https?:\/\/|mailto:|\/(?!\/))/i.test(token.href)) throw new Error(`Unsupported Markdown link: ${token.href}`);
      return `<a href="${escape(token.href)}">${inlineHTML(token.tokens)}</a>`;
    }
    throw new Error(`Unsupported inline Markdown: ${token.type}`);
  }).join('');
}

function projectImage(projectId, value, label) {
  const file = typeof value === 'string' ? value.replace(/^\//, '') : '';
  const attachment = /^assets\/[^/\\:*?"<>|]+\.(png|webp|jpe?g)$/i.test(file);
  const legacy = new RegExp(`^assets/projects/${projectId}/(?:[a-zA-Z0-9_@. -]+/)*[a-zA-Z0-9_@. -]+\\.(png|webp|jpe?g)$`, 'i').test(file);
  if (!attachment && !legacy) throw new Error(`${projectId}: invalid ${label} path; paste project images into assets/`);
  return file;
}

function expandObsidianImages(body) {
  return body.replace(/!\[\[([^\]|]+?\.(?:png|webp|jpe?g))(?:\|([^\]]+))?\]\]/gi, (_match,target,alias) => {
    const name=target.replace(/^assets\//i,'');
    if(name.includes('/')||name.includes('\\'))throw new Error(`Obsidian project images must be stored directly in assets/: ${target}`);
    const alt=(alias?.trim()||path.basename(name,path.extname(name))).replace(/[\[\]]/g,'');
    return `\n\n![${alt}](</assets/${name}>)\n\n`;
  });
}

export function readProjectMarkdown(root, relativeFile) {
  const source = fs.readFileSync(path.join(root, relativeFile), 'utf8').replace(/^\uFEFF/, '');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${relativeFile}: Markdown file needs YAML front matter`);
  const metadata = parseYAML(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`${relativeFile}: invalid YAML front matter`);
  const projectId = metadata.id;
  if (typeof projectId !== 'string' || !projectId) throw new Error(`${relativeFile}: id is required in front matter`);
  if (Object.hasOwn(metadata, 'description') || Object.hasOwn(metadata, 'images')) throw new Error(`${projectId}: description and detail images belong in the Markdown body`);

  const tokens = marked.lexer(expandObsidianImages(match[2]), { gfm: true });
  const bodyBlocks = [];
  const images = [];
  let description = '';

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'space') continue;
    if (token.type === 'html') throw new Error(`${projectId}: raw HTML is not allowed in project Markdown`);
    if (token.type === 'paragraph' && token.tokens?.length === 1 && token.tokens[0].type === 'image') {
      const imageToken = token.tokens[0];
      const item = {
        file: projectImage(projectId, imageToken.href, 'detail image'),
        alt: imageToken.text.trim() || path.basename(imageToken.href,path.extname(imageToken.href)),
        caption: ''
      };
      const next = tokens[index + 1];
      if (next?.type === 'space' && tokens[index + 2]?.type === 'paragraph') {
        const caption = tokens[index + 2];
        if (caption.tokens?.length === 1 && caption.tokens[0].type === 'em') {
          item.caption = plainText(caption.tokens[0].tokens);
          index += 2;
        }
      } else if (next?.type === 'paragraph' && next.tokens?.length === 1 && next.tokens[0].type === 'em') {
        item.caption = plainText(next.tokens[0].tokens);
        index += 1;
      }
      images.push(item);
      bodyBlocks.push({ type: 'image', image: item });
      continue;
    }
    if (token.type === 'paragraph') {
      const text = plainText(token.tokens);
      if (!description) { description = text; continue; }
      bodyBlocks.push({ type: 'paragraph', html: inlineHTML(token.tokens) });
      continue;
    }
    if (token.type === 'heading' && [2, 3].includes(token.depth)) {
      bodyBlocks.push({ type: 'heading', depth: token.depth, text: plainText(token.tokens) });
      continue;
    }
    if (token.type === 'list') {
      bodyBlocks.push({
        type: 'list',
        ordered: token.ordered,
        items: token.items.map(item => plainText(item.tokens.flatMap(child => child.tokens ?? [child])))
      });
      continue;
    }
    throw new Error(`${projectId}: unsupported Markdown block: ${token.type}`);
  }

  const cover = images[0] ? {...images[0],alt:images[0].alt||`${metadata.brand ?? ''} ${metadata.model ?? ''}`.trim()} : null;
  return {
    ...metadata,
    startedAt: metadata.date,
    cover,
    description,
    images,
    bodyBlocks,
    contentFormat: 'markdown'
  };
}
