import {it,expect} from 'vitest';
import {parseWorkspaceSnapshot} from './workspaceSnapshot';
const profile={id:'owner',role:'operator',status:'approved'};
const valid={profile,revision:10,changed:true,cells:[],packs:[],tests:[],members:[]};
it('accepts complete snapshots and exact-version unchanged replies',()=>{
 expect(parseWorkspaceSnapshot(valid,'owner',null)).toEqual(valid);
 expect(parseWorkspaceSnapshot({profile,revision:10,changed:false},'owner',10).changed).toBe(false);
});
it('rejects incomplete, cross-account, regressive and invalidated-cache replies',()=>{
 for(const data of [{...valid,packs:null},{...valid,profile:{...profile,id:'other'}},{...valid,revision:9},{...valid,revision:11,changed:false},{...valid,packs:[{id:'broken'}]},{...valid,members:[{id:'private'}]},{...valid,cells:[{id:'c',lot:'L',status:'available',voltage_mv:'3300',capacity_mah:30000,resistance_mohm:.42}]}])expect(()=>parseWorkspaceSnapshot(data,'owner',10)).toThrow();
 expect(()=>parseWorkspaceSnapshot({profile,revision:10,changed:false},'owner',null)).toThrow();
});
it('accepts access revocation only with empty operational records',()=>{
 const revoked={...valid,profile:{...profile,status:'suspended'},revision:null};expect(parseWorkspaceSnapshot(revoked,'owner',10)).toEqual(revoked);
 expect(()=>parseWorkspaceSnapshot({...revoked,packs:[{id:'p',serial_no:'p',pack_cells:[]}]},'owner',10)).toThrow();
});
