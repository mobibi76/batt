import {inspectionNames,inspectionOrder,processChecks} from '../process';
import { useState, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { production } from './productionCommands';
import { matchCells, type Cell, type Group } from '../../supabase/functions/_shared/matching';
import type { Pack, Inspection } from '../lib';
import type { Intake } from '../intake';
import { supersedeDemoRequests, type Approval } from '../approvals';
type Setter<T> = Dispatch<SetStateAction<T>>;
type Props = {
    demo: boolean;
    cells: Cell[];
    setCells: Setter<Cell[]>;
    packs: Pack[];
    setPacks: Setter<Pack[]>;
    tests: Inspection[];
    setTests: Setter<Inspection[]>;
    reload: () => Promise<void>;
    setToast: Setter<string>;
    setContinuation: Setter<{
        kind: 'cells' | 'pack';
        packId?: string;
    } | null>;
    setDemoRequests: Setter<Approval[]>;
};
export default function useProductionWorkflow({ demo, cells, setCells, packs, setPacks, tests, setTests, reload, setToast, setContinuation, setDemoRequests }: Props) {
    const available = cells.filter(c => c.status === 'available');
    const [busy, setBusy] = useState(false), [reviewReason, setReviewReason] = useState('');
    const [uploadSource, setUploadSource] = useState('synthetic');
    const [lot, setLot] = useState(''), [count, setCount] = useState(3), [groups, setGroups] = useState<Group[]>([]), [matchMessage, setMatchMessage] = useState(''), [elapsed, setElapsed] = useState<number | null>(null);
    const [upload, setUpload] = useState<{
        name: string;
        cells: Cell[];
        errors: string[];
        intake: Intake;
    } | null>(null), [approval, setApproval] = useState<Group | null>(null);
    function errorText(e: unknown) { return e instanceof Error ? e.message : (e as {
        message?: string;
    })?.message || '요청을 처리하지 못했습니다.'; }
    async function action(fn: () => Promise<void>) { setBusy(true); try {
        await fn();
    }
    catch (e) {
        setToast(errorText(e));
    }
    finally {
        setBusy(false);
    } }
    async function importUpload() { if (!upload || upload.errors.length)
        return; await action(async () => { if (demo) {
        if (upload.cells.some(c => cells.some(x => x.id === c.id)))
            throw new Error('이미 등록된 셀 ID가 있습니다.');
        setCells([...cells, ...upload.cells.map(c => ({ ...c, source_kind: uploadSource }))]);
    }
    else {
        await production.importCells(upload.intake, uploadSource, upload.cells);
        await reload();
    } setUpload(null); setContinuation({ kind: 'cells' }); }); }
    async function runMatch() { await action(async () => { const start = performance.now(); let result; if (demo)
        result = matchCells(available.filter(c => !lot || c.lot === lot), count);
    else {
        result = await production.match(lot, count);
    } setGroups(result.groups); setMatchMessage(result.message); setElapsed((performance.now() - start) / 1000); }); }
    async function approve(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!approval)
        return; let createdId = ''; const serial = String(new FormData(e.currentTarget).get('serial')).trim(); await action(async () => { if (demo) {
        if (packs.some(p => p.serial_no === serial))
            throw new Error('이미 사용한 팩 번호입니다.');
        if (approval.cell_ids.some(id => !available.some(c => c.id === id)))
            throw new Error('이미 사용한 셀이 있습니다.');
        const pack: Pack = { process_version:'field-v1', source_kind: 'synthetic', created_by: 'demo-requester', confirmed_name: '체험 공정 담당자', id: crypto.randomUUID(), serial_no: serial, created_at: new Date().toISOString(), pack_cells: approval.cell_ids.map((cell_id, i) => ({ cell_id, position: i + 1 })) };
        createdId = pack.id;
        setPacks([pack, ...packs]);
        setCells(cells.map(c => approval.cell_ids.includes(c.id) ? { ...c, status: 'used' } : c));
    }
    else {
        createdId = await production.confirm(approval, serial, reviewReason);
        await reload();
    } setGroups(groups.filter(g => !g.cell_ids.some(id => approval.cell_ids.includes(id)))); setApproval(null); setContinuation({ kind: 'pack', packId: createdId }); }); }
    async function recordInspection(pack: Pack, kind: Inspection['kind'], result: Inspection['result'], note: string, resultKind: 'measured' | 'test' = 'test', notify = true) {
        if(pack.process_version==='field-v1'){
            const order=inspectionOrder(pack),index=order.indexOf(kind),checks=processChecks(pack,tests);
            if(index<0||order.slice(0,index).some(k=>checks[k]?.result!=='pass'))throw Error('앞선 공정 확인을 먼저 완료하세요. 모듈 검사 → 케이싱 → 최종검사 순서입니다.');
        }
        if (demo) {
        setTests(rows => [{ evidence_kind: 'test', created_by: 'demo-requester', confirmed_name: '체험 '+inspectionNames[kind]+' 담당자', id: crypto.randomUUID(), pack_id: pack.id, kind, result, note, created_at: new Date().toISOString() }, ...rows]);
        setDemoRequests(rows => supersedeDemoRequests(rows, pack.id));
    }
    else {
        await production.inspect(pack.id, kind, result, note, resultKind);
        await reload();
    } if (notify) setToast('검사 결과를 기록했습니다.'); }
    async function review(id: string, status: string, role = 'operator') { await action(async () => { await production.reviewMember(id, status, role); await reload(); setToast('사용자 권한을 변경했습니다.'); }); }
    return { uploadSource, setUploadSource, lot, setLot, count, setCount, groups, setGroups, matchMessage, elapsed, upload, setUpload, approval, setApproval, reviewReason, setReviewReason, busy, action, importUpload, runMatch, approve, recordInspection, review };
}
