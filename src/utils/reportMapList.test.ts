import {describe,it,expect} from 'vitest';
import {nearbyReportAddress} from './reportMapList';
describe('missing report address lookup',()=>{
 it('labels a reverse address as nearby without moving or rewriting the report',()=>expect(nearbyReportAddress({city:'基隆市',district:'仁愛區',address:'62 忠四路, 仁愛區, 基隆市 20042, 臺灣'},'TW-KEE','仁愛區')).toBe('基隆市仁愛區忠四路62號附近'));
 it('rejects a reverse result from another district',()=>expect(nearbyReportAddress({city:'基隆市',district:'中正區',address:'中正路1號'},'TW-KEE','仁愛區')).toBe(''));
 it('rejects a reverse result from another city',()=>expect(nearbyReportAddress({city:'臺北市',district:'仁愛區',address:'中正路1號'},'TW-KEE','仁愛區')).toBe(''));
 it('does not present administrative-only data as a street address',()=>expect(nearbyReportAddress({city:'基隆市',district:'仁愛區',address:'基隆市仁愛區'},'TW-KEE','仁愛區')).toBe(''));
 it('leaves missing or empty provider data unknown',()=>{expect(nearbyReportAddress(null,'TW-KEE','仁愛區')).toBe('');expect(nearbyReportAddress({city:'基隆市',district:'仁愛區',address:''},'TW-KEE','仁愛區')).toBe('');});
});
