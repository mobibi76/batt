import {readFileSync,readdirSync} from 'node:fs';
import {it,expect} from 'vitest';
it('authentication and workspace composition cannot acquire database query responsibilities',()=>{
 const shell=readFileSync('src/App.tsx','utf8');expect(shell).not.toMatch(/supabase\.(from|rpc|functions)/);
 const view=readFileSync('src/Workbench.tsx','utf8');expect(view).not.toMatch(/supabase\./);
});
it('application orchestration delegates record access to the data layer',()=>{
 for(const name of readdirSync('src/application').filter(n=>/\.tsx?$/.test(n))){const source=readFileSync(`src/application/${name}`,'utf8');expect(source).not.toMatch(/supabase\.(from|rpc|functions)/);}
});
