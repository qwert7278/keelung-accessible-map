import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {Report} from '../types';
const storage=vi.hoisted(()=>({get:vi.fn(),set:vi.fn()}));
vi.mock('idb-keyval',()=>storage);
beforeEach(()=>{
 vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',new EventTarget());
 storage.get.mockResolvedValue({version:1,reports:[{id:'qa-local',cityId:'TW-KEE',district:'仁愛區',title:'STATION 車站',address:'100%_巷',description:''}],updates:{}});
});
afterEach(()=>vi.unstubAllGlobals());
it.each([['station',1],['StAtIoN',1],['車站',1],['%_',1],['missing',0],['',1]])('local search %s agrees with case-insensitive literal backend search',async(search,count)=>{
 const {demoRepository}=await import('./demo');let unsubscribe=()=>{};
 const reports=await new Promise<Report[]>((resolve,reject)=>{unsubscribe=demoRepository.subscribe('TW-KEE',resolve,reject,{search});});
 unsubscribe();expect(reports).toHaveLength(count);
});
