import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const heroFiles=new Set(['src/CellPackArtwork.tsx','public/brand/cell-pack-studio.png','public/manual/screens/access-login.jpg','public/manual/screens/access-signup.jpg','public/manual/screens/access-received.jpg']);
export function scopeFor(files){return files.length>0&&files.every(file=>heroFiles.has(file))?'hero':'full';}
async function main(){
 let scope='full';
 if(process.env.GITHUB_EVENT_NAME==='push')try{
  // Compare against the last successful deployment, including intervening failed pushes.
  const response=await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/deploy.yml/runs?status=success&branch=main&per_page=1`,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'}});
  if(!response.ok)throw Error(`Run lookup: ${response.status}`);
  const base=(await response.json()).workflow_runs?.[0]?.head_sha;
  if(!base||!(/^[a-f0-9]{40}$/.test(base)))throw Error('No successful baseline');
  execFileSync('git',['merge-base','--is-ancestor',base,'HEAD']);
  const files=execFileSync('git',['diff','--name-only','-z',base,'HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
  scope=scopeFor(files);
 }catch(error){console.log(`Full verification: ${error.message}`);}
 console.log(`Verification scope: ${scope}`);
 appendFileSync(process.env.GITHUB_OUTPUT,`scope=${scope}\nshards=${scope==='hero'?'[1]':'[1,2]'}\n`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
