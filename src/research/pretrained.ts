export type Expert={feature_indices:number[];scaler_mean:number[];scaler_scale:number[];coef:number[];intercept:number;band_lo_pct:number;band_hi_pct:number};
export type PretrainedModel={version:string;source_url:string;source_sha256:string;license:string;features:string[];bands:Expert[];target_unit:string;soc_cal_m:number;soc_cal_b:number};
export type FeatureRecord={id:string;batch:number;cell_id:string;rpt:number;features:number[];soc_final:number;reference_ah:number};
export type FeatureSource={source_url:string;archive_sha256:string;selection:string;records:FeatureRecord[]};
export function inferCapacity(model:PretrainedModel,features:number[],socFinal:number){
 if(model.target_unit!=='Ah'||model.features.length!==12||model.bands.length!==3||features.length!==12||!features.every(Number.isFinite)||!Number.isFinite(socFinal)||socFinal<0||socFinal>1||![model.soc_cal_m,model.soc_cal_b].every(Number.isFinite))throw Error('모델 또는 ECM 특징값·SOC 형식이 올바르지 않습니다.');
 const soc=Math.min(95,Math.max(5,model.soc_cal_m*socFinal*100+model.soc_cal_b));
 const predictions=model.bands.map(b=>{
  const n=b.feature_indices.length;
  if(!n||![b.scaler_mean,b.scaler_scale,b.coef].every(a=>a.length===n&&a.every(Number.isFinite))||!b.feature_indices.every(i=>Number.isInteger(i)&&i>=0&&i<12)||![b.intercept,b.band_lo_pct,b.band_hi_pct].every(Number.isFinite)||b.band_hi_pct<=b.band_lo_pct)throw Error('모델 계수 형식이 올바르지 않습니다.');
  return b.feature_indices.reduce((y,i,j)=>y+b.coef[j]*(Math.abs(b.scaler_scale[j])>1e-12?(features[i]-b.scaler_mean[j])/b.scaler_scale[j]:features[i]-b.scaler_mean[j]),b.intercept);
 });
 const weights=model.bands.map(b=>soc<=b.band_lo_pct||soc>=b.band_hi_pct?0:Math.max(0,1-Math.abs(soc-(b.band_lo_pct+b.band_hi_pct)/2)/((b.band_hi_pct-b.band_lo_pct)/2)));
 const total=weights.reduce((a,b)=>a+b,0),fallback=total<=1e-12;
 const capacityAh=predictions.reduce((sum,p,i)=>sum+p*(fallback?1/3:weights[i]/total),0);
 if(!Number.isFinite(capacityAh))throw Error('추정 결과가 유효하지 않습니다.');
 return {capacityAh,socPct:soc,fallback,experts:predictions,weights:weights.map(w=>fallback?1/3:w/total),outputCalibration:'none' as const};
}
