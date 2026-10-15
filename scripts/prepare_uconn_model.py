"""Extract MIT-licensed embedded coefficients; never fits or trains a model.
Inputs: pinned main.cpp and cpp_recomputed_features.zip in .local/.
"""
import csv, hashlib, io, json, re, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '10d7bd9ca6d39378406e406e43d2a083575b77ca'
URL = 'https://github.com/REIL-UConn/SOC-Agnostic-Rapid-State-of-Health-Estimation-of-Lithium-Ion-Batteries'
source = ROOT / '.local/uconn-platformio_tests_ecm_mcu_test_src_main.cpp'
archive = ROOT / '.local/cpp_recomputed_features.zip'
code = re.sub(r'//[^\n]*', '', source.read_text(encoding='utf-8'))
code = code[code.index('TopkSocGatedEnsembleLFP buildLfpEnsemble()'):]
features = re.findall(r'ens.feature_order\[\d+\]\s*=\s*"([^"]+)"', code)
bands = []
for block in re.findall(r'BandExpert b;(.*?)ens.bands.push_back\(b\);', code, re.S):
    b = {}
    for key in ['feature_indices', 'scaler_mean', 'scaler_scale', 'coef']:
        values = re.search(r'b\.' + key + r'\s*=\s*\{(.*?)\}', block, re.S)[1]
        b[key] = [float(v.strip()) for v in values.split(',') if v.strip()]
    b['feature_indices'] = list(map(int, b['feature_indices']))
    for key in ['intercept', 'band_lo_pct', 'band_hi_pct']:
        b[key] = float(re.search(r'b\.' + key + r'\s*=\s*([^;]+);', block)[1])
    bands.append(b)
assert len(features) == 12 and len(bands) == 3
model = dict(version=COMMIT, source_url=URL + '/blob/' + COMMIT + '/platformio_tests/ecm_mcu_test/src/main.cpp', license='MIT', source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(), features=features, bands=bands, target_unit='Ah', soc_cal_m=1.16459, soc_cal_b=3.484)

def reference(x, soc):
    ys, ws = [], []
    for b in bands:
        ys.append(b['intercept'] + sum(c * ((x[i]-m)/s if abs(s)>1e-12 else x[i]-m) for i,m,s,c in zip(b['feature_indices'],b['scaler_mean'],b['scaler_scale'],b['coef'])))
        lo, hi = b['band_lo_pct'], b['band_hi_pct']
        ws.append(max(0,1-abs(soc-(lo+hi)/2)/((hi-lo)/2)) if lo<soc<hi else 0)
    return sum(y*w for y,w in zip(ys,ws))/sum(ws) if sum(ws)>1e-12 else sum(ys)/len(ys)

records = []
with zipfile.ZipFile(archive) as z:
    for batch in [1,2,3]:
        name = next(n for n in z.namelist() if n.endswith(f'batch{batch}.csv'))
        groups = {}
        for r in csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig'))):
            groups.setdefault(r['cell_id'], []).append(r)
        for cell, rows in sorted(groups.items()):
            for rpt in sorted({min(float(r['rpt']) for r in rows),max(float(r['rpt']) for r in rows)}):
                r = min((r for r in rows if float(r['rpt'])==rpt), key=lambda r:abs(float(r['soc'])-50))
                x = [float(r[f]) for f in features]
                soc = min(95,max(5,model['soc_cal_m']*min(1,max(0,float(r['SOC_final'])))*100+model['soc_cal_b']))
                records.append(dict(id=f'b{batch}:{cell}:rpt{rpt:g}',batch=batch,cell_id=cell,rpt=rpt,features=x,soc_final=float(r['SOC_final']),reference_ah=float(r['soh_Ah']),oracle_ah=reference(x,soc)))
out = ROOT / 'public/research'
(out/'uconn-model.json').write_text(json.dumps(model,indent=2)+'\n',encoding='utf-8')
(out/'uconn-inference.json').write_text(json.dumps(dict(source_url=URL+'/blob/'+COMMIT+'/data/cpp_recomputed_features.zip',archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),selection='Batches 1–3, each cell first/last RPT, nearest measured SOC to 50%; no holdout claim',records=records),indent=2)+'\n',encoding='utf-8')
print(f'Extracted {len(bands)} experts, {len(records)} records; no training.')
