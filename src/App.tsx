import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib';
import Auth from './Auth';
import Workbench from './Workbench';
import PrivateDemo from './PrivateDemo';
export default function App() {
    const [privateOwner,setPrivateOwner]=useState<string|null>(null);
    const [session, setSession] = useState<Session | null>(null), [demo, setDemo] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [epoch, setEpoch] = useState(0);
    useEffect(() => {
        let alive = true, authEvent = false;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { authEvent = true; if (alive) {
            setSession(next);
            setPrivateOwner(current=>next?.user.id===current?current:null);
            setLoading(false);
        } });
        void supabase.auth.getSession().then(({ data, error }) => { if (!alive || authEvent)
            return; setSession(data.session); setError(error?.message || ''); setLoading(false); });
        return () => { alive = false; subscription.unsubscribe(); };
    }, []);
    async function leave() { setDemo(false); setSession(null); setEpoch(v => v + 1); if (!demo) {
        const r = await supabase.auth.signOut();
        if (r.error)
            setError(r.error.message);
    } }
    if (loading && !demo)
        return <div className="loading">작업 공간을 준비하고 있습니다.</div>;
    if (!session && !demo)
        return <>{error && <p role="alert">{error}</p>}<Auth onDemo={() => { setError(''); setDemo(true); setEpoch(v => v + 1); }}/></>;
    if(privateOwner&&session?.user.id===privateOwner)return <PrivateDemo key={privateOwner} session={session} onExit={()=>{setPrivateOwner(null);setEpoch(v=>v+1);}}/>;
    return <Workbench demoFromFile={demo} onPrivateDemo={session&&!demo?()=>setPrivateOwner(session.user.id):undefined} key={`${demo ? 'demo' : session!.user.id}:${epoch}`} session={session} demo={demo} onLeave={() => void leave()}/>;
}
