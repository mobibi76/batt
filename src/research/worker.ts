import {runExperiment, type ResearchCell, type Limits} from './engine';
self.onmessage=(event:MessageEvent<{cells:ResearchCell[];limits:Limits;seed:number}>)=>{try{self.postMessage({results:runExperiment(event.data.cells,event.data.limits,event.data.seed)});}catch(e){self.postMessage({error:e instanceof Error?e.message:'검증 실행 실패'});}};
