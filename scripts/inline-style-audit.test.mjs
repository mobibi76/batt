import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditInlineStyles} from './inline-style-audit.mjs';

test('rejects fixed styles, including aliases and custom variables',()=>{
  for(const source of [
    'const style={color:"red"}; const ui=<div style={style}/>;',
    'const style={"--bar-ratio":0.5}; const ui=<div style={style}/>;',
    'const constant=0.5; const ui=<div style={{"--bar-ratio":constant}}/>;',
    'const ui=<div style={{"--unknown":measurement}}/>;',
    'el.style.color="red";',
    'el.style.setProperty("--bar-ratio", "0.5");',
  ])assert.ok(auditInlineStyles(source).length,source);
});
test('accepts measured geometry, aliases and conditional absence',()=>{
  for(const source of [
    'const ui=<div style={{"--bar-ratio":count/total}}/>;',
    'const geometry=rect?{"--guide-x":`${rect.left}px`}:undefined; const ui=<div style={geometry}/>;',
    'el.style.setProperty("--scene-x", `${projected.x}px`);',
  ])assert.deepEqual(auditInlineStyles(source),[],source);
});
