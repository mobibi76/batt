import CellPackArtwork from './CellPackArtwork';
import UserManual from './manual/UserManual';
import { useState, type FormEvent } from 'react';
import { BatteryCharging, LoaderCircle, FlaskConical } from 'lucide-react';
import { supabase } from './lib';
export default function Auth({ onDemo }: {
    onDemo: () => void;
}) {
    const [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); setMessage(''); const f = new FormData(e.currentTarget); try {
        const credentials = { email: String(f.get('email')).trim(), password: String(f.get('password')) };
        const { error } = signup ? await supabase.auth.signUp({ ...credentials, options: { data: { display_name: String(f.get('name')) } } }) : await supabase.auth.signInWithPassword(credentials);
        if (error)
            throw error;
        if (signup)
            setMessage('가입 신청을 접수했습니다. 이메일 확인이 요청되면 인증을 완료해주세요. 관리자 승인 후 이용할 수 있습니다.');
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    }
    finally {
        setBusy(false);
    } }
    return <main className="auth-page"><div className="auth-story"><a className="brand" href="#"><span className="brand-icon"><BatteryCharging /></span><span>JSI<span className="brand-sub">BATTERY WORKBENCH</span></span></a><div className="auth-copy"><span className="eyebrow light">PRECISION IN EVERY CELL</span><h1>좋은 배터리는<br />정확한 조합에서<br />시작됩니다.</h1><p>셀 데이터부터 조합, 검사까지.<br />주성산업의 품질을 하나의 흐름으로 연결합니다.</p><CellPackArtwork/><div className="auth-spec"><span>8S1P</span><span>LFP BATTERY</span><span>24V · 30Ah</span></div></div><small>주성산업 · 내부 업무 시스템</small></div><div className="auth-form-wrap"><div className="auth-form"><span className="eyebrow">WELCOME TO JSI</span><h2>{signup ? '사용 권한 신청' : '작업 공간에 로그인'}</h2><p className="muted">{signup ? '관리자가 신청을 확인한 뒤 이용 권한을 부여합니다.' : '승인된 구성원만 생산·품질 데이터에 접근할 수 있습니다.'}</p><form onSubmit={submit}>{signup && <label>이름<input name="name" required maxLength={80} placeholder="이름을 입력하세요" autoComplete="name"/></label>}<label>이메일<input name="email" type="email" required placeholder="name@company.com" autoComplete="email"/></label><label>비밀번호<input name="password" type="password" required minLength={8} placeholder="비밀번호를 입력하세요" autoComplete={signup ? 'new-password' : 'current-password'}/></label>{message && <div role="status" className="notice">{message}</div>}<button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin icon-18"/> : null}{signup ? '가입 신청' : '로그인'}</button></form><p className="auth-switch">{signup ? '이미 계정이 있으신가요?' : '처음 방문하셨나요?'} <button onClick={() => { setSignup(!signup); setMessage(''); }}>{signup ? '로그인' : '사용 권한 신청'}</button></p><div className="auth-divider"><span>먼저 살펴보세요</span></div><button className="secondary full" onClick={onDemo}><FlaskConical className="icon-17"/>가상 데이터로 공정 체험</button><small className="demo-note">기능 시연용 가상 데이터입니다. 측정 파일 등록부터 공정 순서대로 안내합니다. 주성산업 실측 자료는 로그인 후 고객 데이터 체험에서 확인하세요.</small></div></div><UserManual context="access"/></main>;
}
