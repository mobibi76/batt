import {expect,it} from 'vitest';
import {emptyStudy,parseCrossref,sourceKey,validateStudy} from './literature';
it('accepts references but requires evidence before becoming an application candidate',()=>{
 const ref={...emptyStudy,title:'Pack lifetime',url:'https://doi.org/10.1234/test',purpose:'Predict cycles'};
 expect(validateStudy(ref)).toBe('');expect(validateStudy({...ref,status:'candidate'})).toContain('검증 근거');
 expect(validateStudy({...ref,status:'candidate',inputs:'waveforms',conditions:'8S LFP',evidence:'independent 20 pack test; report linked'})).toBe('');
 expect(validateStudy({...ref,status:'verified' as any})).toContain('분류');
 expect(validateStudy({...ref,url:'javascript:alert(1)'})).toContain('주소');
 expect(sourceKey('https://doi.org/10.1234/TEST/')).toBe(sourceKey('http://doi.org/10.1234/test'));
});
it('extracts bibliography without inventing purpose, target or validation',()=>{
 expect(parseCrossref({message:{items:[]}})).toEqual([]);
 const result=parseCrossref({message:{DOI:'10.1/test',title:['Example'],author:[{given:'A',family:'B'}],published:{'date-parts':[[2025]]}}});
 expect(result).toEqual([{title:'Example',url:'https://doi.org/10.1/test',authors:'A B',year:'2025'}]);
});
