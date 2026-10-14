export type Tab='overview'|'cells'|'matching'|'packs'|'quality'|'members'|'research'|'twin'|'approvals';
export type WorkMode='field'|'control';
export function modeForTask(tab:Tab,current:WorkMode):WorkMode{
 if(tab==='matching')return 'field';
 if(['cells','quality','research','approvals','twin','members'].includes(tab))return 'control';
 return current;
}
