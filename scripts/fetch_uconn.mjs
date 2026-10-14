// Run from the repository root. Fetch only the pinned, checksum-verified numeric archive.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const repo='REIL-UConn/SOC-Agnostic-Rapid-State-of-Health-Estimation-of-Lithium-Ion-Batteries';
const commit='10d7bd9ca6d39378406e406e43d2a083575b77ca';
const expected='47c89e5b58f81e315dc3a41244f8ddad35a14123aace34307cb5b28e1ba88e24';
const response=await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/data/ecm_stat_features.zip`);
if(!response.ok)throw Error('Download failed: '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Source checksum mismatch');
fs.mkdirSync('.local',{recursive:true});
fs.writeFileSync('.local/ecm_stat_features.zip',bytes);
console.log('Verified archive downloaded. Rebuild with:');
console.log('python -X utf8 scripts/prepare_uconn.py .local/ecm_stat_features.zip public/research/uconn-lfp.json '+commit);
