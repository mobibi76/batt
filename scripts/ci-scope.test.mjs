import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scopeFor} from './ci-scope.mjs';
test('isolated title artwork can use targeted checks',()=>assert.equal(scopeFor(['src/CellPackArtwork.tsx','public/brand/cell-pack-studio.png','public/manual/screens/access-login.jpg']),'hero'));
test('unknown, shared styles, auth, workflow and mixed changes require full checks',()=>{for(const file of ['src/Auth.tsx','src/styles.css','.github/workflows/deploy.yml','src/Workbench.tsx','package-lock.json','public/brand/unknown.js'])assert.equal(scopeFor(['public/brand/cell-pack-studio.png',file]),'full');assert.equal(scopeFor([]),'full');});
