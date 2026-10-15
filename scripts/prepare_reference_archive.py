"""Build a versioned index of deployed research evidence; no remote fetching."""
import hashlib, json, shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
public=root/'public/research'
def read(name): return json.loads((public/name).read_text(encoding='utf-8-sig'))
u=read('uconn-lfp.json'); m=read('uconn-model.json'); f=read('uconn-inference.json'); s=read('severson-capacity.json')
source=root/'.local/uconn-platformio_tests_ecm_mcu_test_src_main.cpp'
assert hashlib.sha256(source.read_bytes()).hexdigest()==m['source_sha256']
(public/'sources').mkdir(exist_ok=True)
shutil.copyfile(source,public/'sources/uconn-main.cpp.txt')
def asset(path,label):
    return dict(path=path,label=label,sha256=hashlib.sha256((public/path).read_bytes()).hexdigest())
ul=asset('uconn-lfp.json','앱에서 사용하는 55셀 표본·전처리 근거')
um=asset('uconn-model.json','공개 학습 계수·출처')
uf=asset('uconn-inference.json','112개 추론 입력·출처')
license=asset('UCONN-PROCESSED-LICENSE.txt','MIT 라이선스·저작권 원문')
cpp=asset('sources/uconn-main.cpp.txt','MIT 라이선스 C++ 원본 스냅샷')
sd=asset('severson-capacity.json','앱에 반영한 용량 요약 전체·배치 메모·출처')
entries={
 'uconn-original':dict(source_url=u['source_url'],title='UConn 원본 데이터',scope='원본 전체가 아닌 연구진 전처리에서 추출한 55셀 표본과 출처 보관. 대학 원시 데이터 전체의 대체본은 아닙니다.',assets=[ul],provenance={k:v for k,v in u.items() if k!='cells'}),
 'uconn-processed':dict(source_url=u['processed_repository']+'/tree/'+u['commit'],title='UConn 연구진 전처리 자료',scope='고정 커밋과 사용 표본·변환식·압축 파일 해시 보관. 전체 ECM 특징값 ZIP은 배포하지 않습니다.',assets=[ul,license],provenance={k:u[k] for k in ['commit','archive_sha256','condition','transform','citation','license']}),
 'uconn-model':dict(source_url=m['source_url'],title='UConn 학습 계수 원본',scope='사용 계수와 해당 커밋의 C++ 원문을 MIT 고지와 함께 보관. 원시 파형 전체 처리의 앱 재현을 뜻하지 않습니다.',assets=[um,cpp,license],provenance={k:m[k] for k in ['version','source_sha256','license','target_unit']}),
 'uconn-features':dict(source_url=f['source_url'],title='UConn C++ 재계산 특징값',scope='사용한 112개 기록과 원본 ZIP 해시·선정 규칙 보관. 전체 ZIP 보관본은 아닙니다.',assets=[uf,license],provenance={k:v for k,v in f.items() if k!='records'}),
 'uconn-license':dict(source_url=u['processed_repository']+'/blob/'+u['commit']+'/LICENSE',title='UConn MIT 라이선스',scope='앱에 저작권·이용허락 전문을 보관합니다. MIT는 라이선스 이름입니다.',assets=[license],provenance={'commit':u['commit']}),
 'severson-data':dict(source_url=s['source_url'],title='Severson 공식 데이터',scope='공식 용량 요약 140기록·고유 135셀 및 배치 주의사항 보관. 논문 분석 124셀이나 전체 원시 파형이 아닙니다.',assets=[sd],provenance={k:s[k] for k in ['retrieved_at','citation','license','license_evidence','files','transform']}),
 'severson-paper':dict(source_url='https://web.mit.edu/braatzgroup/Severson_NatureEnergy_2019.pdf',title='Severson 논문·시험 조건',scope='앱 작성자의 검증 조건·성적 요약과 원문 해시 보관. 논문 전문의 공개 재배포본이 아닙니다.',assets=[],provenance={'evidence_version':'severson-evidence-2026-10-15.1'}),
 'severson-doi':dict(source_url='https://doi.org/10.1038/s41560-019-0356-8',title='Severson 논문 DOI',scope='동일 논문의 영구 식별자와 앱 내 조건 요약으로 대체합니다.',assets=[],provenance={'evidence_version':'severson-evidence-2026-10-15.1'}),
 'severson-code':dict(source_url='https://github.com/rdbraatz/data-driven-prediction-of-battery-cycle-life-before-capacity-degradation/blob/1ef13d27c66dc3d73affdaa008fbeba5687b2ea4/Load%20Data.ipynb',title='Severson 정제 코드',scope='고정 커밋·파일 해시·실제 정제 절차를 사실 요약으로 보관. 노트북 전문이나 예측 모델 코드의 재배포본이 아닙니다.',assets=[],provenance={'evidence_version':'severson-evidence-2026-10-15.1'})
}
out=dict(version='research-reference-archive-2026-10-15.1',verified_on='2026-10-15',policy='외부 링크 자동 변경·상태 추정 없음. 보관 자료는 Git 버전과 함께 배포. 전체 사이트의 신규 오프라인 접속을 보장하지 않음.',entries=entries)
(root/'src/research/referenceArchive.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Indexed {len(entries)} references; asset SHA-256 included.')
