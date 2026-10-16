import FilePicker from './FilePicker';
import {inspectionNames,inspectionOrder} from './process';
import FieldConfirmation from './FieldConfirmation';
import UserManual from './manual/UserManual';
import SampleDataView from './SampleDataView';
import DataValue from './DataValue';
import type {PrivateDataset} from './demoData';
import useProductionWorkflow from './application/useProductionWorkflow';
import { readIntake } from './intake';
import RunEvidence from './RunEvidence';
import EvidenceWorkspace, { sourceNames, resultNames } from './EvidenceWorkspace';
import { ChoiceChips } from './ChoiceChips';
import { modeForTask, type Tab } from './workModes';
import OperationsConsole, { type WorkMode } from './OperationsConsole';
import './workflow.css';
import PackWorkspace from './PackWorkspace';
import OutcomeReview from './OutcomeReview';
import useQualityIndex from './useQualityIndex';
import { packSignal, independentReview, type PackFilter, type PackSignal } from './workflow';
import MemberPermissions from './MemberPermissions';
import { canConfirm, canSubmit, processStages } from './permissions';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, BatteryCharging, Boxes, Check, FileUp, Search, ShieldCheck, Sparkles, X, AlertCircle, LoaderCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Session } from '@supabase/supabase-js';
import { metricCohort, type MetricScope, downloadDemoMeasurements, sampleCells, template, readFile, number, date, qualitySummary, type Pack } from './lib';
import { type Cell } from '../supabase/functions/_shared/matching';
import ResearchLab from './ResearchLab';
import { createDemoRequest, submitTwin, type Approval } from './approvals';
import type { Layout } from './twin/model';
import { production } from './application/productionCommands';
import useRecords from './application/useRecords';
import { exportQualityReport } from './application/qualityReport';
const DigitalTwin = lazy(() => import('./DigitalTwin'));
const ApprovalCenter = lazy(() => import('./ApprovalCenter'));
const names: Record<Tab, string> = { overview: '운영 현황', cells: '셀 데이터', matching: '셀 매칭', packs: '팩 · 검사이력', quality: '품질 리포트', members: '사용자 관리', research: '알고리즘 검증', twin: '공정 관리', approvals: '품질·공정 승인함' };
const roleNames = { admin: '관리자', operator: '업무 구성원', viewer: '조회자' };
const statusNames = { pending: '승인 대기', approved: '승인 완료', rejected: '가입 반려', suspended: '이용 중지' };
function Badge({ children, tone = 'green' }: {
    children: ReactNode;
    tone?: string;
}) { return <span className={`badge ${tone}`}>{children}</span>; }
function Empty({ title, body }: {
    title: string;
    body: string;
}) { return <div className="empty"><Boxes className="icon-32"/><h3>{title}</h3><p>{body}</p></div>; }
function Modal({ title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) { return <div className="modal-backdrop" onClick={onClose}><section role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e => e.stopPropagation()}><div className="section-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="닫기"><X className="icon-20"/></button></div>{children}</section></div>; }
export default function Workbench({ session, demo, onLeave, onPrivateDemo, privateDemo, demoFromFile=false }: {
    demoFromFile?:boolean;
    onPrivateDemo?:()=>void;
    privateDemo?:{dataset:PrivateDataset;mode:'raw'|'workflow';cells:Cell[]};
    session: Session | null;
    demo: boolean;
    onLeave: () => void;
}) {
    const [packPane,setPackPane]=useState<'history'|'record'>('history');
    const [sampleOpen,setSampleOpen]=useState(false);
    const [demoInventory,setDemoInventory]=useState(false);
    const [metricScope, setMetricScope] = useState<MetricScope>('measured');
    const [workMode, setWorkMode] = useState<WorkMode>('field');
    useEffect(() => setMetricScope(demo ? 'test' : 'measured'), [demo]);
    const [tab, setTabState] = useState<Tab>(privateDemo||demoFromFile?'cells':'overview'), [toast, setToast] = useState(''), [search, setSearch] = useState(''), [packSearch, setPackSearch] = useState('');
    const { profile, cells, setCells, packs, setPacks, tests, setTests, members, setMembers, authLoading, authError, lastSync, syncError, revision: recordsRevision, reload } = useRecords(session?.user.id, demo, setToast, privateDemo?.cells??(demoFromFile?[]:undefined));
    const [reviewBatch, setReviewBatch] = useState<string | undefined>(), [reviewSeed, setReviewSeed] = useState<Cell[] | undefined>();
    const [reviewTargets, setReviewTargets] = useState<{
        batch_id: string;
        name: string;
        cell_ids: string[];
    }[]>([]);
    async function openStockReview(ids: string[]) { if (demo) {
        setReviewSeed(cells.filter(c => ids.includes(c.id)));
        setReviewBatch(undefined);
        setTab('cells');
    }
    else {
        const r = { data: await production.reviewTargets(ids) };
        if (r.data.length === 1) {
            setReviewBatch(r.data[0].batch_id);
            setTab('cells');
        }
        else
            setReviewTargets(r.data);
    } setApproval(null); }
    const [packScope, setPackScope] = useState<MetricScope>('all');
    const [packFilter, setPackFilter] = useState<PackFilter>('all'), [approvalTarget, setApprovalTarget] = useState({ packId: '', requestId: '' }), [qualityRevision, setQualityRevision] = useState(0), [continuation, setContinuation] = useState<{
        kind: 'cells' | 'pack';
        packId?: string;
    } | null>(null);
    function setTab(next: Tab) { if(next==='matching'&&continuation?.kind==='cells')setContinuation(null); if (next === 'packs')
        setPackScope('all'); setWorkMode(mode => modeForTask(next, mode)); setTabState(next); }
    function switchWorkMode(mode: WorkMode) { setWorkMode(mode); setSelectedPack(null); setTabState('overview'); }
    const [demoRequests, setDemoRequests] = useState<Approval[]>([]), [twinSeed, setTwinSeed] = useState<Layout | null>(null);
    const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
    const { uploadSource, setUploadSource, lot, setLot, count, setCount, groups, setGroups, matchMessage, elapsed, upload, setUpload, approval, setApproval, reviewReason, setReviewReason, busy, action, importUpload, runMatch, approve, recordInspection, review } = useProductionWorkflow({ demo, cells, setCells, packs, setPacks, tests, setTests, reload, setToast, setContinuation, setDemoRequests });
    useEffect(() => { if (profile)
        setWorkMode(profile.role === 'operator' && !profile.quality_reviewer ? 'field' : 'control'); }, [profile?.id]);
    useEffect(() => { if (tab !== 'twin')
        setTwinSeed(null); }, [tab]);
    async function requestTwin(layout: Layout, title: string, note: string) { if (demo) {
        if (demoRequests.some(r => r.kind === 'twin' && ['pending', 'approved'].includes(r.status) && JSON.stringify(r.snapshot) === JSON.stringify(layout)))
            throw Error('동일한 공정이 이미 대기 중이거나 승인되었습니다.');
        const request = createDemoRequest('twin', layout, title, note);
        setDemoRequests(rows => [request, ...rows]);
        setApprovalTarget({ packId: '', requestId: request.id });
    }
    else {
        const id = await submitTwin(layout, title, note);
        setApprovalTarget({ packId: '', requestId: id });
    } }
    const activeProfile = demo ? { id: privateDemo?`private-demo-${session!.user.id}`:'demo', email: 'demo@jsi.local', display_name: '체험 사용자', role: 'admin' as const, status: 'approved' as const, created_at: '' } : profile;
    const canWrite = demo || canConfirm(activeProfile, 'assembly'), canConfigure = demo || canSubmit(activeProfile);
    const inspectionKinds = (['module','casing','aging','final'] as const).filter(kind => demo || canConfirm(activeProfile, kind));
    const qualityIndex = useQualityIndex(demo, profile, demoRequests, `${tab}:${recordsRevision}:${qualityRevision}`);
    function openPacks(filter: PackFilter = 'all', pack?: Pack, scope: MetricScope = 'all',pane:'history'|'record'='history') { setPackPane(pane); setPackFilter(filter); setPackSearch(''); setTab('packs'); setPackScope(scope); if (pack)
        setSelectedPack(pack); }
    function openApproval(packId = '', requestId = '') { setSelectedPack(null); setApprovalTarget({ packId, requestId }); setTab('approvals'); }
    function openWork(signal: PackSignal) { if (independentReview(signal, activeProfile!, demo))
        openApproval('', signal.request?.id);
    else if (signal.state === 'ready')
        openApproval(signal.pack.id);
    else
        openPacks('all', signal.pack); }
    const summary = useMemo(() => qualitySummary(packs, tests), [packs, tests]);
    const packCohort = metricCohort(packs, tests, packScope);
    const available = cells.filter(c => c.status === 'available');
    const lots = [...new Set(available.map(c => c.lot))].sort();
    useEffect(() => { if (toast) {
        const timer = setTimeout(() => setToast(''), 6500);
        return () => clearTimeout(timer);
    } }, [toast]);
    const leave = onLeave;
    const exportReport = () => exportQualityReport({ packs, tests, cells, demo, metricScope });
    if (authLoading && !demo)
        return <div className="loading"><LoaderCircle className="spin"/>작업 공간을 준비하고 있습니다.</div>;
    if (!demo && profile?.status !== 'approved')
        return <main className="waiting-page"><UserManual context="access"/><ShieldCheck className="icon-48"/><h1>{profile ? statusNames[profile.status] : '계정 확인 필요'}</h1><p>{authError || '관리자가 사용 권한을 승인하면 작업 공간에 입장할 수 있습니다.'}</p><p className="muted">{session?.user.email}</p><button className="primary" onClick={() => window.location.reload()}>승인 상태 새로고침</button><button className="text-button" onClick={leave}>로그아웃</button></main>;
    const filtered = cells.filter(c => `${c.id} ${c.lot}`.toLowerCase().includes(search.toLowerCase()));
    if(demoFromFile)filtered.sort((a,b)=>a.lot.localeCompare(b.lot)||a.capacity_mah-b.capacity_mah);
    const chart = cells.slice(0, 48).map((c, i) => ({ name: i + 1, capacity: c.capacity_mah }));
    return <div className="app-shell console-shell"><OperationsConsole focusedPackId={continuation?.kind==='pack'?continuation.packId:undefined} onOpenPack={pack=>openPacks('all',pack)} sampleView={sampleOpen?<SampleDataView dataset={privateDemo?.dataset} cells={cells} onClose={()=>setSampleOpen(false)}/>:undefined} onSampleData={demo?()=>setSampleOpen(true):undefined} onPrivateDemo={onPrivateDemo} privateDemo={!!privateDemo} demoLabel={demoFromFile?'기능 시연 · 가상 측정값':privateDemo?(privateDemo.mode==='workflow'?'고객 제공값 + 시험 보완값 · 시험 결과':'고객 제공 원자료 · 결측 유지'):undefined} metricScope={metricScope} onMetricScope={setMetricScope} dataFocus={reviewBatch || reviewSeed || privateDemo?.mode==='raw' ? '고객 자료 검토' : privateDemo||demoFromFile&&demoInventory?'셀 재고':undefined} active task={tab} taskTitle={tab==='packs'?(workMode==='field'?'팩 진행 이력':'검사·조치 이력'):names[tab]} onLogout={leave} onReport={exportReport} key={activeProfile!.id} mode={workMode} onMode={switchWorkMode} profile={activeProfile!} demo={demo} packs={packs} tests={tests} requests={qualityIndex.rows} cells={cells.length} available={available.length} lastSync={lastSync} syncError={syncError} approvalError={qualityIndex.error} onPacks={(filter,scope)=>openPacks(filter,undefined,scope)} onOpen={setTab} onWork={openWork} onRecord={(pack,kind,result,note,resultKind)=>recordInspection(pack,kind,result,note,resultKind,false)}>
  {demoFromFile&&tab==='cells'&&<section className="demo-process-guide" data-shared aria-label="전체 공정 체험 안내"><strong>{cells.length?'2. 용량별 분류·보관 확인':'1. 충방전 측정 파일 등록'}</strong><p>{cells.length?'등록한 가상 셀을 LOT·용량 순으로 확인하고 보류·재검사도 연습할 수 있습니다. 이후 같은 셀로 8셀 조합 → 모듈 검사 → 케이싱 → 최종검사 → 품질 승인을 진행합니다.':'가상 파일을 내려받아 아래 파일 가져오기로 선택하세요. 미리보기에서 검증 후 등록합니다. 파일 등록을 생략하려면 예시 셀로 다음 단계를 진행하세요.'}</p><div className="workflow-actions">{!cells.length?<><button className="secondary" onClick={()=>downloadDemoMeasurements()}>가상 측정 파일 받기</button><button className="secondary" onClick={()=>downloadDemoMeasurements(true)}>용량 누락 오류 파일 받기</button><button className="text-button" onClick={()=>{setCells(sampleCells());setReviewSeed(undefined);setReviewBatch(undefined);setDemoInventory(true);}}>예시 셀로 다음 단계</button></>:<><button className="secondary" onClick={()=>{setReviewSeed(undefined);setReviewBatch(undefined);setDemoInventory(true);}}>용량별 재고 확인</button><button className="primary" onClick={()=>setTab('matching')}>이 셀로 8셀 조합</button></>}</div></section>}
  {continuation && !(demoFromFile&&continuation.kind==='cells') && (tab === 'cells' || tab === 'matching') && <section className="panel workflow-continuation" role="status"><div><strong>{continuation.kind === 'cells' ? '측정 데이터 준비 완료' : '셀 조합 확정 완료'}</strong><p>{continuation.kind === 'cells' ? '이 측정값으로 조합 후보를 비교할 수 있습니다.' : '다음은 같은 팩의 검사 결과를 연결하는 단계입니다.'}</p></div><button className="primary" onClick={() => { if (continuation.kind === 'cells')
        setTab('matching');
    else {
        const p = packs.find(p => p.id === continuation.packId);
        openPacks('all', p,'all','record');
    } setContinuation(null); }}>{continuation.kind === 'cells' ? '조합 비교로 이어가기' : '이 팩 검사로 이어가기'}</button></section>}
  {tab === 'cells' && <><div data-step="고객 자료 검토"><EvidenceWorkspace initialIntake={privateDemo?.dataset.intake} onRowsChanged={rows => setCells(current => current.map(c => { const r = rows.find(r => r.id === c.id); return r ? { ...c, voltage_mv: r.voltage_mv ?? c.voltage_mv, resistance_mohm: r.resistance_mohm ?? c.resistance_mohm, capacity_mah: r.capacity_mah ?? c.capacity_mah, measured_at: r.measured_at ?? c.measured_at, field_origins:r.field_origins||c.field_origins, status: r.state === 'ready' ? 'available' : r.state === 'used' ? 'used' : 'held' } : c; }))} initialBatch={reviewBatch} inventorySeed={reviewSeed} demo={demo} canWrite={canWrite} onPack={reload}/></div><details className="panel progressive"><summary>측정값 분포 확인</summary><div className="overview-grid workflow-measurements"><section className="panel chart-panel"><div className="section-head"><div><h2>셀 용량 분포</h2><p>등록 순서별 측정값 · 최대 48개 셀</p></div><Badge tone="gray">mAh</Badge></div>{chart.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 20, right: 12, left: 2, bottom: 0 }}><defs><linearGradient id="capacity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-line)" className="chart-gradient-start"/><stop offset="100%" stopColor="var(--color-chart-line)" className="chart-gradient-end"/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--color-chart-grid)"/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ className: 'chart-axis-tick' }}/><YAxis domain={['dataMin - 100', 'dataMax + 100']} tickLine={false} axisLine={false} tick={{ className: 'chart-axis-tick' }} width={62}/><Tooltip formatter={(v) => [`${number(Number(v))} mAh`, '용량']} labelFormatter={v => `셀 #${v}`}/><Area isAnimationActive={false} type="monotone" dataKey="capacity" stroke="var(--color-chart-line)" strokeWidth={2} fill="url(#capacity)"/></AreaChart></ResponsiveContainer></div> : <Empty title="첫 셀 데이터를 등록하세요" body="등록한 셀의 용량 측정값이 여기에 표시됩니다."/>}<div className="chart-foot"><span className="legend-dot"/>셀 용량 측정값<span>{demo ? privateDemo?'고객 제공 용량 · 체험용':'합성 데이터 · 실제 성과 아님' : '개별 셀 측정 데이터'}</span></div></section></div></details><section className="upload-callout"><div className="upload-icon"><FileUp className="icon-24"/></div><div><h2>측정 파일로 시작하세요</h2><p>CSV 또는 XLSX · 최대 5MB / 5,000행 · 표준 컬럼 양식 사용</p><small>고객 장비 양식·결측 자료는 고객 자료 검토에서 등록하세요. 여기서는 전압·용량·시간대가 있는 표준 측정값을 받습니다. 내부저항은 선택 항목입니다.</small></div><div className="upload-actions"><button className="secondary" onClick={template}><ArrowDownToLine className="icon-16"/>샘플 양식</button>{canWrite && <FilePicker accept=".csv,.xlsx" disabledReason={busy?'측정 파일을 처리 중입니다. 잠시 기다려 주세요.':''} onFile={f=>action(async()=>setUpload({name:f.name,...await readFile(f),intake:await readIntake(f)}))}><FileUp className="icon-16"/>파일 가져오기</FilePicker>}</div></section><section data-step="셀 재고" className="panel"><div className="section-head"><div><h2>셀 재고 <span className="count">{cells.length}</span></h2><p>원측정값을 보존하며 재측정은 사유와 이력을 기록합니다.</p></div><div className="search"><Search className="icon-16"/><input placeholder="셀 ID 또는 LOT 검색" value={search} onChange={e => setSearch(e.target.value)}/></div></div><CellTable key={search} cells={filtered} onReview={canWrite ? id => void action(() => openStockReview([id])) : undefined}/></section></>}
  {tab === 'matching' && <><div className={`sop-strip ${groups.length?'matching-results-context':''}`}><ShieldCheck className="icon-20"/><strong>JSI-SOP-v2</strong><span>Δ 전압 ≤ 10 mV</span><span>내부저항 · 참고 항목</span><span>Δ 용량 ≤ 500 mAh</span></div><section className="panel match-settings"><div><h2>추천 조건</h2><p>한 번에 최대 500개 셀을 탐색합니다.</p></div><div><ChoiceChips label="대상 LOT" value={lot} onChange={e => setLot(e.target.value)}><option value="">전체 LOT</option>{lots.map(l => <option key={l}>{l}</option>)}</ChoiceChips></div><div><ChoiceChips label="추천 팩 수" value={count} onChange={e => setCount(Number(e.target.value))}>{[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n}팩</option>)}</ChoiceChips></div><button className="primary" disabled={busy || !canWrite || available.length < 8} onClick={runMatch}>{busy ? <LoaderCircle className="spin icon-17"/> : <Sparkles className="icon-17"/>}조합 추천</button></section>{elapsed !== null && <div className="match-summary"><Badge>{groups.length}개 추천 조합</Badge><span>{elapsed.toFixed(2)}초 소요</span><p>{matchMessage}</p></div>}<div className="candidates">{groups.map((g, i) => <section className="panel candidate" data-step={`8셀 추천 조합 ${i+1}`} key={g.cell_ids.join(',')}><div className="section-head"><div><span className="eyebrow">RECOMMENDATION {String(i + 1).padStart(2, '0')}</span><h2>8셀 추천 조합</h2></div><Badge><Check className="icon-13"/>{demo?'시험 SOP 적합':'SOP 적합'}</Badge></div><details className="candidate-cells"><summary>구성 셀 8개 확인</summary><div className="cell-tiles">{g.cell_ids.map((id, n) => <div key={id}><BatteryCharging className="icon-21"/><small>{String(n + 1).padStart(2, '0')}</small><span>{id}</span></div>)}</div></details>{privateDemo&&<p className="data-origin-supplemented">보완값 포함 체험 결과 · 내부저항은 가상값</p>}<div className="spread-grid"><div><small>전압 편차</small><strong>{number(g.spreads.voltage_mv, 3)} <em>mV</em></strong></div><div><small>용량 편차</small><strong>{number(g.spreads.capacity_mah, 3)} <em>mAh</em></strong></div></div><details className="candidate-explanation"><summary>추천 기준·한계</summary><p>셀의 용량·전압 차이를 비교해 추천합니다. 가능한 모든 조합 중 최선임을 보장하지 않으며, 불량을 예측하는 결과도 아닙니다.</p></details><div className="candidate-footer"><span>편차 균일도 <strong>{g.score}/100</strong><small>불량 확률이 아닙니다.</small></span><button className="primary" disabled={busy || !canWrite} onClick={() => setApproval(g)}>조합 검토 · 확정 <ArrowRight className="icon-16"/></button></div></section>)}</div>{!groups.length && <section className="panel"><Empty title="추천 조합을 준비하세요" body={available.length < 8 ? '매칭 가능한 셀 8개 이상을 먼저 등록하세요.' : '대상 LOT와 팩 수를 선택한 뒤 조합 추천을 실행하세요.'}/></section>}<div className="bottom-note matching-limit" data-shared><details><summary>추천 방식·제공 범위</summary><p>기준을 통과하는 8셀 팩을 많이 만드는 것이 목표입니다. 수명과 안전성은 아직 예측하지 않습니다.</p></details></div></>}
  {tab === 'packs' && <><PackWorkspace mode={workMode} scope={packScope} onScope={setPackScope} packs={packCohort.packs} tests={packCohort.tests} requests={qualityIndex.rows} filter={packFilter} onFilter={setPackFilter} search={packSearch} onSearch={setPackSearch} onOpen={setSelectedPack}/>{qualityIndex.error && <p className="notice">{qualityIndex.error}</p>}</>}
  {tab === 'quality' && <><div data-step="품질 비교"><OutcomeReview scope={metricScope} setScope={setMetricScope} packs={packs} tests={tests} onPacks={filter => openPacks(filter, undefined, metricScope)} onResearch={() => setTab('research')}/></div><section className="panel report"><div className="section-head"><div><h2>품질 리포트</h2><p>등록 데이터 기반 · 템플릿 보고서</p></div><button className="secondary" onClick={exportReport}><ArrowDownToLine className="icon-17"/>보고서 내려받기</button></div><div className="report-body"><details><summary>집계 기준·제공 범위</summary><h3>데이터 집계 기준</h3><p>불량률: 최종검사를 받은 팩 중 <strong>최근 결과가 불합격인 팩의 비율</strong>입니다. 재검사 결과도 반영합니다.</p><p>연결률: 전체 팩 중 셀 8개와 필수 검사 기록이 모두 있는 팩의 비율입니다. 새 팩은 모듈 검사·케이싱·최종검사, 기존 팩은 에이징·최종검사를 확인합니다.</p><div className="notice"><AlertCircle className="icon-18"/>불량률 2.08% → 1.0%는 목표이며, 달성한 실적이 아닙니다.</div><h3>예측 QC · 수명 분석</h3><p>현재는 조합 기준과 검사 결과를 확인합니다. AI 불량 예측, 수명·보증등급 추정은 아직 제공하지 않습니다.</p>{demo && <Badge tone="amber">현재 지표는 체험·시험 결과이며 실제 품질 성과가 아닙니다.</Badge>}</details></div></section></>}
  {tab === 'research' && <ResearchLab ephemeral={!!privateDemo} userId={activeProfile!.id} demo={demo} canSave={canConfigure}/>}
  {tab === 'twin' && <Suspense fallback={<div className="notice">3D 공정 공간을 준비하고 있습니다.</div>}><DigitalTwin onOpenRecords={() => openPacks()} key={activeProfile!.id + (twinSeed ? 'import' : 'local')} userId={activeProfile!.id} canEdit={canConfigure} initialLayout={twinSeed} onSubmitApproval={requestTwin} onOpenApprovals={() => openApproval('', approvalTarget.requestId)}/></Suspense>}
  {tab === 'approvals' && <Suspense fallback={<div className="notice">승인함을 준비합니다.</div>}><ApprovalCenter demo={demo} profile={activeProfile!} packs={packs} cells={cells} tests={tests} demoRequests={demoRequests} onDemoChange={setDemoRequests} initialPackId={approvalTarget.packId} initialRequestId={approvalTarget.requestId} onChanged={() => setQualityRevision(n => n + 1)} onOpenPack={id => { const pack = packs.find(p => p.id === id); if (pack)
        openPacks('all', pack); }} onResults={() => setTab('quality')} onNavigate={setTab} onOpenTwin={layout => { setTwinSeed(layout); setTab('twin'); }}/></Suspense>}
  {tab === 'members' && <section className="panel"><div className="section-head"><div><h2>구성원 승인</h2><p>가입 승인 후 공정 담당 또는 최종 품질 승인권자를 지정하세요. 시스템 관리자는 품질 승인 권한이 없습니다.</p></div><Badge tone="amber">{members.filter(m => m.status === 'pending').length}건 대기</Badge></div>{demo ? <Empty title="체험 모드에서는 권한을 변경하지 않습니다" body="실제 관리자 계정으로 로그인하면 가입 신청을 처리할 수 있습니다."/> : <div className="table-wrap"><table><thead><tr><th>이름 / 이메일</th><th>역할</th><th>상태</th><th>신청일</th><th>관리</th></tr></thead><tbody>{members.map(m => <tr key={m.id}><td><strong>{m.display_name || '이름 미입력'}</strong><small className="block">{m.email}</small></td><td>{roleNames[m.role]}{m.role === 'operator' && <small className="block">{[...(m.process_stages || []).map(stage => processStages[stage]), ...(m.quality_reviewer ? ['최종 품질 승인권자'] : [])].join(' · ') || '업무 권한 미지정'}</small>}</td><td><Badge tone={m.status === 'approved' ? 'green' : m.status === 'pending' ? 'amber' : 'gray'}>{statusNames[m.status]}</Badge></td><td>{date(m.created_at)}</td><td><MemberPermissions member={m} busy={busy} onStages={stages => void action(async () => { await production.setStages(m.id, stages); await reload(); setToast('공정 담당 권한을 변경했습니다.'); })} onReviewer={() => void action(async () => { await production.setReviewer(m.id, !m.quality_reviewer); await reload(); setToast('최종 품질 승인 권한을 변경했습니다.'); })}/>{m.role !== 'admin' && <div className="row-actions">{m.status !== 'approved' ? <><button className="small-button" disabled={busy} onClick={() => review(m.id, 'approved')}>구성원 가입 승인</button><button className="small-button" disabled={busy} onClick={() => review(m.id, 'approved', 'viewer')}>조회자 승인</button>{m.status === 'pending' && <button className="text-button danger" disabled={busy} onClick={() => review(m.id, 'rejected')}>반려</button>}</> : <button className="text-button danger" disabled={busy} onClick={() => review(m.id, 'suspended', m.role)}>이용 중지</button>}</div>}</td></tr>)}</tbody></table></div>}</section>}
    </OperationsConsole>{toast && <div role="status" className="toast"><AlertCircle className="icon-18"/>{toast}<button onClick={() => setToast('')} aria-label="알림 닫기"><X className="icon-15"/></button></div>}
  {upload && <Modal title="파일 등록 미리보기" onClose={() => setUpload(null)}><p>{upload.name} · {upload.cells.length}개 셀</p><ChoiceChips label="표준 자료 출처" disabled={demo} value={demo?'synthetic':uploadSource} onChange={e => setUploadSource(e.target.value)}><option value="synthetic">합성 시험자료</option><option value="reconstructed">재구성 자료</option><option value="measured">실측 자료</option></ChoiceChips>{upload.errors.length ? <div className="notice error"><strong>{upload.errors.length}개 오류를 수정하세요</strong>{upload.errors.slice(0, 12).map((s, i) => <p key={i}>{s}</p>)}</div> : <><Badge>형식 검증 완료</Badge><CellTable cells={upload.cells.slice(0, 5)}/><p className="muted">처음 5개 셀을 표시합니다. 중복 ID가 있으면 전체 등록을 취소합니다.</p></>}<div className="modal-actions"><button className="secondary" onClick={() => setUpload(null)}>취소</button><button className="primary" disabled={busy || !!upload.errors.length} onClick={importUpload}>전체 {upload.cells.length}개 등록</button></div></Modal>}
  {!!reviewTargets.length && <Modal title="원자료별 재검사 검토" onClose={() => setReviewTargets([])}><p>원자료 연결을 유지하며 배치별로 검토합니다.</p><div className="row-actions">{reviewTargets.map(t => <button key={t.batch_id} className="secondary" onClick={() => { setReviewBatch(t.batch_id); setTab('cells'); setReviewTargets([]); }}>{t.name} · 선택 셀 {t.cell_ids.length}개 · {t.cell_ids.join(', ')}</button>)}</div></Modal>}
  {approval && <Modal title="팩 조합 확정" onClose={() => setApproval(null)}><p>셀 8개를 확인하고 팩 일련번호를 입력하세요. 확정 시 해당 셀은 사용 처리됩니다. 최종 품질 승인은 검사 이후 별도로 진행합니다.</p><div className="id-list">{approval.cell_ids.map(id => <span key={id}>{id}</span>)}</div><form onSubmit={approve}><label>조합 검토 사유<textarea required maxLength={2000} value={reviewReason} onChange={e => setReviewReason(e.target.value)}/></label><label>팩 일련번호<input name="serial" required maxLength={80} placeholder="예: JSI-20261014-001"/></label><div className="notice"><ShieldCheck className="icon-18"/>{demo?'체험 팩 구성 · 운영 서버에 저장하지 않습니다.':'확정 시 서버에서 SOP와 셀 사용 상태를 다시 검증합니다.'}</div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setApproval(null)}>취소</button><button type="button" className="secondary" disabled={busy} onClick={() => void action(async () => { await openStockReview(approval.cell_ids); })}>보류·재검사 검토로</button><button className="primary" disabled={busy}>확인 및 팩 구성</button></div></form></Modal>}
  {selectedPack && <Modal title={selectedPack.serial_no} onClose={() => setSelectedPack(null)}><nav className="pack-modal-tabs" aria-label="팩 상세 업무"><button type="button" aria-pressed={packPane==='history'} onClick={()=>setPackPane('history')}>품질 이력</button>{inspectionKinds.length>0&&<button type="button" aria-pressed={packPane==='record'} onClick={()=>setPackPane('record')}>검사 기록</button>}</nav><section className="pack-modal-view" hidden={packPane!=='history'}><p className="notice">{sourceNames[selectedPack.source_kind || 'unknown']} · 추천 실행 {selectedPack.matching_run_id || '기존 표준 매칭'}</p><p className="muted">셀 조합 확인: {selectedPack.confirmed_name || selectedPack.created_by || '기존 기록'}</p><div className="workflow-pack-next"><strong>{packSignal(selectedPack, tests, qualityIndex.rows).reason}</strong><button className="secondary" onClick={() => { const status = packSignal(selectedPack, tests, qualityIndex.rows); openApproval(status.request ? '' : selectedPack.id, status.request?.id); }} disabled={!packSignal(selectedPack, tests, qualityIndex.rows).linked || qualityIndex.rows === null || (!packSignal(selectedPack, tests, qualityIndex.rows).request && !canConfigure)}>{packSignal(selectedPack, tests, qualityIndex.rows).request ? '품질 제출본 확인' : '이 팩 품질 검토 요청'}</button></div><RunEvidence demo={demo} key={selectedPack.id} packId={selectedPack.id} ids={selectedPack.pack_cells.map(c => c.cell_id)} id={selectedPack.matching_run_id}/><h3>구성 셀</h3><div className="id-list">{selectedPack.pack_cells.sort((a, b) => a.position - b.position).map(c => <span key={c.cell_id}>{c.position}. {c.cell_id}</span>)}</div><h3>검사 기록</h3><div className="inspection-list">{tests.filter(t => t.pack_id === selectedPack.id).map(t => <div key={t.id}><Badge tone={t.result === 'pass' ? 'green' : 'red'}>{t.result === 'pass' ? '합격' : '불합격'}</Badge><strong>{inspectionNames[t.kind]} · {resultNames[t.evidence_kind || 'unknown']}</strong><small>{date(t.created_at)} · 확인: {t.confirmed_name || t.created_by || '기존 기록'}</small><p>{t.note || '메모 없음'}</p></div>)}</div>{!tests.some(t => t.pack_id === selectedPack.id) && <p className="muted">등록된 검사 결과가 없습니다.</p>}</section><section className="pack-modal-view" hidden={packPane!=='record'}>{inspectionKinds.length > 0 && <FieldConfirmation key={selectedPack.id} initialKind={inspectionOrder(selectedPack)[0]} embedded pack={selectedPack} profile={activeProfile!} demo={demo} onRecord={async(...args)=>{await recordInspection(...args);setPackPane('history');}} onClose={()=>setSelectedPack(null)}/>}</section></Modal>}
  </div>;
}
function Stat({ label, value, unit, note, icon }: {
    label: string;
    value: string;
    unit: string;
    note: string;
    icon: ReactNode;
}) { return <section className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}<span>{unit}</span></div><p>{note}</p></section>; }
function CellTable({ cells, onReview }: {
    cells: Cell[];
    onReview?: (id: string) => void;
}) {
 const size = 6;
 const [page, setPage] = useState(0);
 const current = Math.min(page, Math.max(0, Math.ceil(cells.length / size) - 1));
 if (!cells.length) return <Empty title="표시할 셀 데이터가 없습니다" body="측정 파일을 등록하거나 검색 조건을 변경하세요."/>;
 return <><div className="table-wrap cell-inventory"><table role="table" aria-label="셀 측정값과 재고 상태"><thead role="rowgroup"><tr role="row"><th>셀 ID</th><th className="numeric">용량 <small>mAh</small></th><th>상태</th><th className="numeric">전압 <small>mV</small></th><th className="numeric">내부저항 <small>mΩ</small></th><th>LOT</th>{onReview && <th>검토</th>}</tr></thead><tbody role="rowgroup">{cells.slice(current * size, (current + 1) * size).map(c => <tr key={c.id} role="row">
 <td role="cell" className="mono strong cell-identity"><DataValue row={c} field="id">{c.id}</DataValue></td>
 <td role="cell" className="numeric"><span className="cell-mobile-label" aria-hidden="true">용량 · mAh</span><DataValue row={c} field="capacity_mah">{number(c.capacity_mah, 3)}</DataValue></td>
 <td role="cell"><span className="cell-mobile-label" aria-hidden="true">상태</span><Badge tone={c.status === 'available' ? 'green' : 'gray'}>{c.status === 'available' ? '매칭 가능' : c.status === 'used' ? '사용 완료' : '보류'}</Badge></td>
 <td role="cell" className="numeric"><span className="cell-mobile-label" aria-hidden="true">전압 · mV</span><DataValue row={c} field="voltage_mv">{number(c.voltage_mv, 3)}</DataValue></td>
 <td role="cell" className="numeric"><span className="cell-mobile-label" aria-hidden="true">내부저항 · mΩ</span><DataValue row={c} field="resistance_mohm">{number(c.resistance_mohm, 5)}</DataValue></td>
 <td role="cell" className="mono"><span className="cell-mobile-label" aria-hidden="true">LOT</span><DataValue row={c} field="lot">{c.lot}</DataValue></td>
 {onReview && <td role="cell"><button className="text-button" disabled={c.status === 'used'} onClick={() => onReview(c.id)}>측정 검토</button></td>}
 </tr>)}</tbody></table></div><div className="console-pager"><button className="secondary" disabled={current === 0} onClick={() => setPage(current - 1)}>이전 셀</button><span aria-label={`${cells.length}셀 중 ${current*size+1}–${Math.min((current+1)*size,cells.length)}셀 · ${current+1}페이지`}>{current + 1} / {Math.ceil(cells.length / size)}</span><button className="secondary" disabled={(current + 1) * size >= cells.length} onClick={() => setPage(current + 1)}>다음 셀</button></div></>;
}
