import { useEffect, useRef, useState } from 'react';
import { sampleCells, type Profile, type Pack, type Inspection } from '../lib';
import type { Cell } from '../../supabase/functions/_shared/matching';
import { readRecords, readMembership } from '../data/workbenchRepository';
export default function useRecords(owner: string | undefined, demo: boolean, onError: (message: string) => void, seed?: Cell[]) {
    const [profile, setProfile] = useState<Profile | null>(null), [cells, setCells] = useState<Cell[]>(() => demo ? seed ?? sampleCells() : []), [packs, setPacks] = useState<Pack[]>([]), [tests, setTests] = useState<Inspection[]>([]), [members, setMembers] = useState<Profile[]>([]);
    const [authLoading, setAuthLoading] = useState(!demo), [authError, setAuthError] = useState(''), [lastSync, setLastSync] = useState(''), [syncError, setSyncError] = useState(false), [revision, setRevision] = useState(0);
    const snapshotVersion = useRef<number | null>(null);
    const active = useRef(false), pending = useRef<Promise<void> | null>(null), controller = useRef<AbortController | null>(null), errorHandler = useRef(onError);
    errorHandler.current = onError;
    async function reload(force = true): Promise<void> {
        if (demo || !owner || !active.current)
            return;
        if (pending.current) {
            await pending.current;
            if (force && active.current)
                return reload(false);
            return;
        }
        const signal = controller.current!.signal;
        const request = new AbortController();
        const cancel = () => request.abort();
        signal.addEventListener('abort',cancel,{once:true});
        const timeout = setTimeout(()=>request.abort(),10000);
        const work = (async () => { try {
            const data = await readRecords(owner, request.signal, snapshotVersion.current);
            if (signal.aborted || !active.current)
                return;
            setProfile(data.profile);
            if (data.changed) {
                setCells(data.cells);
                setPacks(data.packs);
                setTests(data.tests);
                setMembers(data.members);
                setRevision(v => v + 1);
            }
            snapshotVersion.current = data.revision;
            setLastSync(new Date().toLocaleTimeString('ko-KR'));
            setSyncError(false);
        }
        catch (e) {
            if (signal.aborted || !active.current)
                return;
            setSyncError(true);
            errorHandler.current(request.signal.aborted?'조회가 10초 안에 완료되지 않았습니다. 자동으로 다시 확인합니다.':(e as {
                message: string;
            }).message || '조회 실패');
        } finally {clearTimeout(timeout);signal.removeEventListener('abort',cancel);} })();
        pending.current = work;
        try {
            await work;
        }
        finally {
            if (pending.current === work)
                pending.current = null;
        }
    }
    useEffect(() => {
        active.current = true;
        const abort = new AbortController();
        controller.current = abort;
        if (!demo && owner)
            void readMembership(owner, abort.signal).then(p => { if (!abort.signal.aborted) {
                setProfile(p);
                setAuthLoading(false);
                if (p.status === 'approved')
                    void reload();
            } }).catch(() => { if (!abort.signal.aborted) {
                setAuthError('사용자 권한을 확인할 수 없습니다. 잠시 후 다시 시도하세요.');
                setAuthLoading(false);
            } });
        return () => { active.current = false; abort.abort(); pending.current = null; };
    }, [owner, demo]);
    const refresh = useRef(reload);
    refresh.current = reload;
    useEffect(() => { if (demo || profile?.status !== 'approved')
        return; const update = () => { if (!document.hidden)
        void refresh.current(false); }; const timer = setInterval(update, 15000); window.addEventListener('focus', update); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); }; }, [demo, profile?.status]);
    return { profile, cells, setCells, packs, setPacks, tests, setTests, members, setMembers, authLoading, authError, lastSync, syncError, revision, reload };
}
