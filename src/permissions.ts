import type {Profile} from './lib';
export const processStages={assembly:'셀 등록·매칭',aging:'에이징 검사',final:'최종검사'} as const;
export type ProcessStage=keyof typeof processStages;
type Access=Pick<Profile,'role'|'status'|'quality_reviewer'|'process_stages'>;
export function canConfirm(p:Access|null|undefined,stage:ProcessStage){return p?.status==='approved'&&p.role==='operator'&&p.process_stages?.includes(stage)===true;}
export function canSubmit(p:Access|null|undefined){return Object.keys(processStages).some(stage=>canConfirm(p,stage as ProcessStage));}
export function canReview(p:Access|null|undefined){return p?.status==='approved'&&p.role==='operator'&&p.quality_reviewer===true;}
