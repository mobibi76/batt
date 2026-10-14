"""Extract a reproducible small numerical subset; never execute upstream code.
Usage: python -X utf8 scripts/prepare_uconn.py archive.zip output.json pinned_commit
"""
import csv, hashlib, io, json, math, sys, zipfile
from pathlib import Path
archive, destination, commit = sys.argv[1:]
selected=[]; provenance=[]
with zipfile.ZipFile(archive) as z:
 for batch in [1,2,3]:
  name=f'ecm_stat_features/LFP/ecm_fit_results_with_stats_batch{batch}.csv'
  raw=z.read(name); chosen={}; scanned=0
  for line,r in enumerate(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))),2):
   scanned+=1
   try:
    rpt=float(r['rpt']);soc=float(r['soc']);voltage=float(r['V_meas_str'].split()[0])*1000
    resistance=float(r['R0_manual'])*1000;capacity=float(r['soh_Ah'])*1000
   except (ValueError,KeyError,IndexError):continue
   if rpt!=0 or not 45<=soc<=55 or not all(math.isfinite(v) and v>0 for v in [voltage,resistance,capacity]):continue
   key=r['cell_id']
   item={'id':f'UCONN-B{batch}-{key}','cohort':f'Batch {batch}','voltage_mv':round(voltage,3),'resistance_mohm':round(resistance,5),'capacity_mah':round(capacity,3),'soc_pct':round(soc,6),'rpt':0,'source_row':line,'source_cell_id':key,'source_group':r['group_id']}
   if key not in chosen or abs(soc-50)<abs(chosen[key]['soc_pct']-50):chosen[key]=item
  selected.extend(sorted(chosen.values(),key=lambda x:x['id']))
  provenance.append({'file':name,'sha256':hashlib.sha256(raw).hexdigest(),'scanned':scanned,'selected':len(chosen)})
result={'schema_version':1,'id':'uconn-lfp-rpt0-soc50-v1','title':'UConn LFP · 초기 RPT / SOC 45–55%','source_url':'https://digitalcommons.lib.uconn.edu/reil_datasets/3/','processed_repository':'https://github.com/REIL-UConn/SOC-Agnostic-Rapid-State-of-Health-Estimation-of-Lithium-Ion-Batteries','commit':commit,'archive_sha256':hashlib.sha256(Path(archive).read_bytes()).hexdigest(),'license':'Original data: CC BY 4.0; processed repository: MIT (Sina Navidi, 2026)','nominal_capacity_mah':1200,'condition':'Batches 1–3 only; RPT=0; SOC 45–55%; one pulse per batch/cell closest to SOC 50%. Temperature not supplied in feature CSV. Compare within batch only.','transform':'voltage_mv = first V_meas_str sample (pulse-preceding voltage) * 1000; resistance_mohm = R0_manual * 1000 (pulse-derived, not production ACIR); capacity_mah = soh_Ah * 1000. No synthetic filling or scaling to 30Ah.','citation':'Li, Tingkai et al. (2025), UConn-MathWorks LFP/Gr Second-Life Battery Aging Dataset. Processed features: Navidi et al. (2026), DOI 10.1016/j.apenergy.2026.128451.','files':provenance,'cells':selected}
Path(destination).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'cells':len(selected),'files':provenance},ensure_ascii=False))
