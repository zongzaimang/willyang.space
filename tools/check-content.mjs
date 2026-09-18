import {root} from './build-site.mjs';
import {loadContent} from './lib/content.mjs';
try {
  const content=loadContent(root);
  console.log(`Content valid: ${content.projects.length} projects, ${content.news.length} news entries.`);
} catch(error) {console.error(error.message);process.exitCode=1;}
