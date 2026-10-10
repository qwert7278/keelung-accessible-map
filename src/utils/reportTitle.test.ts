import {describe,it,expect} from 'vitest';
import {defaultReportTitle} from './reportTitle';
import {validateDraft} from './validation';
import type {ReportDraft} from '../types';
const draft:ReportDraft={cityId:'TW-KEE',district:'仁愛區',title:'',address:'',description:'',category:'uneven_surface',wheelchairAccess:'difficult',location:{lat:25.1263,lng:121.7413}};
describe('automatic report title',()=>{
  it('keeps unknown address explicit and creates a valid draft',()=>{
    const title=defaultReportTitle(draft);
    expect(title).toContain('基隆市仁愛區已標記位置');
    expect(validateDraft({...draft,title})).toBeNull();
  });
  it('uses the selected address and category without exceeding 80 characters',()=>{
    expect(defaultReportTitle({...draft,address:'精一路19號'})).toContain('精一路19號');
    expect(defaultReportTitle({...draft,address:'路'.repeat(200)})).toHaveLength(80);
  });
});
