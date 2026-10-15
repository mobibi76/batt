import { supabase, type Profile, type Pack, type Inspection } from '../lib';
import type { Cell } from '../../supabase/functions/_shared/matching';
export type Records = {
    profile: Profile;
    cells: Cell[];
    packs: Pack[];
    tests: Inspection[];
    members: Profile[];
};
export async function readMembership(id: string, signal: AbortSignal) { const r = await supabase.from('profiles').select('*').eq('id', id).abortSignal(signal).single(); if (r.error)
    throw r.error; return r.data as Profile; }
export async function readRecords(id: string, signal: AbortSignal, revision: number | null): Promise<Records & {
    changed: boolean;
    revision: number | null;
}> {
    const r = await supabase.rpc('read_workbench', { known_revision: revision }).abortSignal(signal);
    if (r.error)
        throw r.error;
    if (!r.data?.profile || r.data.profile.id !== id || typeof r.data.changed !== 'boolean')
        throw Error('조회 계정 또는 응답 형식이 일치하지 않습니다.');
    return r.data;
}
export async function command<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> { const r = await supabase.rpc(name, args); if (r.error)
    throw r.error; return r.data as T; }
export async function calculate<T>(name: string, body: Record<string, unknown>): Promise<T> { const r = await supabase.functions.invoke(name, { body }); if (r.error) {
    let detail = '';
    try {
        detail = (await r.error.context?.json())?.error;
    }
    catch { }
    throw Error(detail || r.error.message);
} if (r.data?.error)
    throw Error(r.data.error); return r.data as T; }
