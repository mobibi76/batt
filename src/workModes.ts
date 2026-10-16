export type Tab='overview'|'cells'|'matching'|'packs'|'quality'|'members'|'research'|'twin'|'approvals';
export type WorkMode='field'|'control'|'research';
export const modeNames={field:'생산',control:'품질',research:'연구'} as const;
export function modeForTask(tab:Tab,current:WorkMode):WorkMode{
 if(['cells','matching'].includes(tab))return 'field';
 if(['research','twin'].includes(tab))return 'research';
 if(['quality','approvals'].includes(tab))return 'control';
 return current;
}
