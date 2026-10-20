import fs from 'node:fs';
import path from 'node:path';
import {auditInlineStyles,runtimeProperties} from './inline-style-audit.mjs';
const source=fs.readdirSync('src',{recursive:true}).filter(f=>/\.(css|tsx|ts)$/.test(f));
const css=source.filter(f=>f.endsWith('.css'));
const definitions=new Set(),references=new Set(),errors=[];
const runtime=runtimeProperties;
for(const file of source){const text=fs.readFileSync(path.join('src',file),'utf8');if(file.endsWith('.css'))for(const m of text.matchAll(/(--[\w-]+)\s*:/g))definitions.add(m[1]);const withoutDefinitions=text.replace(/(--[\w-]+)\s*:/g,':');for(const m of withoutDefinitions.matchAll(/--[a-z][\w-]+/g))references.add(m[0]);
 if(file.endsWith('.css')&&file!=='design-tokens.css'){
  const clean=text.replace(/\/\*[\s\S]*?\*\//g,'');
  if(/#[\da-f]{3,8}\b|rgba?\(/i.test(clean))errors.push(file+': colour outside shared tokens');
  for(const m of clean.matchAll(/(?:^|[;{])\s*(font-size|border-radius|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap|row-gap|column-gap)\s*:\s*([^;{}]+)/g)){if(/\b\d+(?:\.\d+)?px\b/.test(m[2]))errors.push(file+': raw '+m[1]+' '+m[2]);}
  for(const m of clean.matchAll(/(?:^|[;{])\s*(--[\w-]+|box-shadow|border(?:-[a-z]+)?|outline(?:-[a-z]+)?)\s*:\s*([^;{}]+)/g)){
   if(/\b\d+(?:\.\d+)?(?:px|rem|em)\b/.test(m[2]))errors.push(file+': fixed design value outside tokens: '+m[1]+' '+m[2]);
  }
 }
 if(file.endsWith('.tsx'))errors.push(...auditInlineStyles(text,file));
}
for(const name of references)if(!definitions.has(name)&&!runtime.has(name))errors.push('Undefined token: '+name);
for(const name of definitions)if(!references.has(name))errors.push('Unused token: '+name);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Design check passed: ${css.length} stylesheets, ${definitions.size} defined tokens; runtime geometry is explicit.`);
