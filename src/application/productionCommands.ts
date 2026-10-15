import { command, calculate } from '../data/workbenchRepository';
import type { Intake } from '../intake';
import type { Cell, Group, matchCells } from '../../supabase/functions/_shared/matching';
import type { Inspection } from '../lib';
export const production = {
    setStages: (id: string, stages: string[]) => command('set_process_permissions', { target_id: id, stages }),
    setReviewer: (id: string, enabled: boolean) => command('set_quality_reviewer', { target_id: id, enabled }),
    reviewTargets: (ids: string[]) => command<{
        batch_id: string;
        name: string;
        cell_ids: string[];
    }[]>('inventory_review_targets', { cell_ids: ids }),
    importCells: (intake: Intake, source: string, cells: Cell[]) => command('import_reviewed_intake', { payload: { ...intake, source_kind: source }, note: '표준 양식 등록 · 사용자 지정 출처', items: cells }),
    match: (lot: string, count: number) => calculate<ReturnType<typeof matchCells>>('match-cells', { lot, count }),
    confirm: (group: Group, serial: string, reason: string) => command<string>('approve_recorded_pack', { cell_ids: group.cell_ids, serial, run: group.run_id, reason }),
    inspect: (pack: string, kind: Inspection['kind'], result: Inspection['result'], note: string, resultKind: 'measured' | 'test') => command('record_inspection', { target_pack: pack, test_kind: kind, test_result: result, test_note: note, result_kind: resultKind }),
    reviewMember: (id: string, status: string, role: string) => command('review_member', { target_id: id, new_status: status, new_role: role }),
};
