import type {Profile} from './lib';
export const processStages={assembly:'셀 등록·매칭·케이싱',aging:'모듈 검사·기존 에이징',final:'최종검사'} as const;
export type ProcessStage=keyof typeof processStages;
type Access=Pick<Profile,'role'|'status'|'quality_reviewer'|'process_stages'>;
export function canConfirm(p:Access|null|undefined,stage:ProcessStage|'module'|'casing'){return p?.status==='approved'&&p.role==='operator'&&p.process_stages?.includes(stage==='module'?'aging':stage==='casing'?'assembly':stage)===true;}
export function canSubmit(p:Access|null|undefined){return Object.keys(processStages).some(stage=>canConfirm(p,stage as ProcessStage));}
export function canReview(p:Access|null|undefined){return p?.status==='approved'&&p.role==='operator'&&p.quality_reviewer===true;}
