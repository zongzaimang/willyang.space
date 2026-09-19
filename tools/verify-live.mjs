import {hash} from './lib/content.mjs';
import {verifyArtifact} from './lib/artifact.mjs';
import {root} from './build-site.mjs';
import path from 'node:path';

const origin=process.argv[2];
if(!origin || !/^https?:\/\//.test(origin)) throw new Error('Usage: node tools/verify-live.mjs <site-origin>');
const expectedVersion=process.env.EXPECTED_RELEASE;
const expected=expectedVersion ? {version:expectedVersion} : verifyArtifact(path.join(root,'dist-static'));
if(expected.preview) throw new Error('Cannot verify a preview as a release');
let error;
const attempts=Number(process.env.VERIFY_ATTEMPTS||6);
for(let attempt=0;attempt<attempts;attempt++) {
  try {
    const base=new URL(origin);
    const manifestResponse=await fetch(new URL(`/release.json?release=${expected.version}`,base),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!manifestResponse.ok) throw new Error(`release.json: HTTP ${manifestResponse.status}`);
    const deployed=await manifestResponse.json();
    if(deployed.version!==expected.version) throw new Error(`Expected ${expected.version}, found ${deployed.version}`);
    // Check every route and asset, not merely a successful workflow status.
    const files=Object.entries(expected.files??deployed.files).filter(([f])=>!['.nojekyll','CNAME'].includes(f));
    for(let start=0;start<files.length;start+=8) await Promise.all(files.slice(start,start+8).map(async([file,digest])=>{
      const url=new URL(`/${file}`,base);url.searchParams.set('release',expected.version);
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==digest) throw new Error(`Live file differs: ${file} (HTTP ${response.status})`);
    }));
    const missing=await fetch(new URL(`/missing-${expected.version}/`,base),{signal:AbortSignal.timeout(15000)});
    if(missing.status!==404) throw new Error(`Missing route returned ${missing.status}, expected 404`);
    console.log(`Live release ${expected.version} verified: ${files.length} files and 404.`);
    error=null;break;
  } catch(e) {error=e;console.error(`Verification ${attempt+1}/${attempts}: ${e.message}`);if(attempt+1<attempts)await new Promise(r=>setTimeout(r,10000));}
}
if(error) {
  if(process.env.GITHUB_ACTIONS==='true') {
    const message=String(error.message).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
    console.error(`::error title=Live verification failed::${message}`);
  }
  process.exitCode=1;
}
