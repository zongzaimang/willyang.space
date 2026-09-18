import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build-site.mjs';
import {within} from './lib/content.mjs';
import {verifyArtifact,replaceOutput} from './lib/artifact.mjs';

export function saveRelease(workspace=root) {
  const source=path.join(workspace,'dist-static'),release=verifyArtifact(source);
  if(release.preview) throw new Error('Preview artifacts cannot be released');
  const target=within(workspace,`releases/${release.version}`);
  if(!fs.existsSync(target)) fs.cpSync(source,target,{recursive:true});
  verifyArtifact(target);
  return release.version;
}
export function restoreRelease(workspace,version) {
  if(!/^[a-f0-9]{20}$/.test(version??'')) throw new Error('Use a 20-character release version from releases/');
  const source=within(workspace,`releases/${version}`),release=verifyArtifact(source);
  if(release.preview) throw new Error('Preview artifacts cannot be restored to production');
  return replaceOutput(workspace,'dist-static',stage=>fs.cpSync(source,stage,{recursive:true}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [command,version]=process.argv.slice(2);
    if(command==='save') console.log(`Saved release ${saveRelease(root)}`);
    else if(command==='restore') console.log(`Restored artifact ${restoreRelease(root,version).version}; content sources and live website are unchanged.`);
    else if(command==='verify') {
      const release=verifyArtifact(path.join(root,'dist-static'));
      if(release.preview) throw new Error('Refusing preview artifact');
      console.log(`Verified ${Object.keys(release.files).length} files, ${release.routes.length} routes, release ${release.version}.`);
    } else throw new Error('Usage: release.mjs verify | save | restore <version>');
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
