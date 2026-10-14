import type {Tab} from './WorkspaceNavigation';
export type WorkMode='field'|'control';
export function modeForTask(tab:Tab,current:WorkMode):WorkMode{
 if(tab==='matching')return 'field';
 if(['cells','quality','research','approvals','twin','members'].includes(tab))return 'control';
 return current;
}
export const tasksForMode:Record<WorkMode,Tab[]>={field:['overview','packs','matching'],control:['overview','approvals','cells','packs','quality','twin']};
