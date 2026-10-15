import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import archive from './referenceArchive.json';
import {reference} from './lifetimeSchema';
import {seversonEvidence} from './seversonEvidence';
it('retains each deployed artifact with a verified SHA and a stated preservation scope',()=>{
 expect(Object.keys(archive.entries)).toHaveLength(9);
 for(const entry of Object.values(archive.entries)){expect(entry.scope.length).toBeGreaterThan(10);expect(entry.source_url).toMatch(/^https:\/\//);for(const asset of entry.assets){expect(asset.path).not.toContain('..');expect(createHash('sha256').update(readFileSync('public/research/'+asset.path)).digest('hex')).toBe(asset.sha256);}}
 expect(archive.entries['uconn-model'].assets.some(a=>a.path==='UCONN-PROCESSED-LICENSE.txt')).toBe(true);
});
it('pins source revisions and includes offline evidence in validation reports',()=>{
 expect(reference.processing).toContain(seversonEvidence.code.commit);expect(reference.processing).not.toContain('/master/');expect(reference.evidence).toEqual(seversonEvidence);
 for(const source of [seversonEvidence.paper,seversonEvidence.code])expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
 expect(archive.entries['uconn-processed'].source_url).toContain('10d7bd9ca6d39378406e406e43d2a083575b77ca');
});
it('wraps every research outbound link in the common archive component',()=>{
 const paths=['src/ResearchLab.tsx','src/research/DataValidation.tsx','src/research/PretrainedExplorer.tsx','src/research/SeversonExplorer.tsx'];
 const texts=paths.map(p=>readFileSync(p,'utf8'));
 expect(texts.every(s=>!/<a\s/.test(s))).toBe(true);
 const ids=texts.flatMap(s=>[...s.matchAll(/<SourceReference id="([^"]+)"/g)].map(m=>m[1]));expect([...ids].sort()).toEqual(Object.keys(archive.entries).sort());
});
