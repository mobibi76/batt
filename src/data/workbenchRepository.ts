import { supabase, type Profile } from '../lib';
import {parseWorkspaceSnapshot,type WorkspaceSnapshot} from './workspaceSnapshot';
export async function readMembership(id: string, signal: AbortSignal) {
    const request=new AbortController();
    const cancel=()=>request.abort();
    signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted)request.abort();
    const timeout=setTimeout(cancel,10000);
    try{
        const r=await supabase.from('profiles').select('*').eq('id',id).abortSignal(request.signal).single();
        if(r.error)throw r.error;
        if(r.data?.id!==id)throw Error('조회 계정이 일치하지 않습니다.');
        return r.data as Profile;
    }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
}
export async function readRecords(id: string, signal: AbortSignal, revision: number | null): Promise<WorkspaceSnapshot> {
    const r = await supabase.rpc('read_workbench', { known_revision: revision }).abortSignal(signal);
    if (r.error)
        throw r.error;
    return parseWorkspaceSnapshot(r.data,id,revision);
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
