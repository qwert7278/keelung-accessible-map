import {describe,it,expect} from 'vitest';
import {defaultReportTitle,displayReportTitle} from './reportTitle';
import {validateDraft} from './validation';
import type {Report,ReportDraft} from '../types';
const draft:ReportDraft={cityId:'TW-KEE',district:'仁愛區',title:'',address:'',description:'',category:'uneven_surface',wheelchairAccess:'difficult',location:{lat:25.1263,lng:121.7413}};
describe('automatic report title',()=>{
  it('keeps unknown address explicit and creates a valid draft',()=>{
    const title=defaultReportTitle(draft);
    expect(title).toContain('基隆市仁愛區已標記位置');
    expect(validateDraft({...draft,title})).toBeNull();
  });
  it('normalizes a reverse provider address in the generated title',()=>expect(defaultReportTitle({...draft,address:'44 忠二路, 仁愛區, 基隆市 200001, Taiwan'})).toBe('基隆市仁愛區忠二路44號 · 路面不平／破損'));
  it('uses the selected address and category without exceeding 80 characters',()=>{
    expect(defaultReportTitle({...draft,address:'精一路19號'})).toContain('精一路19號');
    expect(defaultReportTitle({...draft,address:'路'.repeat(200)})).toHaveLength(80);
  });
});

describe('existing public titles',()=>{
 const report:Report={...draft,id:'title-test',title:'44 忠二路, 仁愛區, 基隆市 200001, Taiwan · 路面不平／破損',address:'44 忠二路, 仁愛區, 基隆市 200001, Taiwan',status:'open',beforeImageUrl:'',afterImageUrl:null,createdAt:'',updatedAt:'',officialSource:false,schemaVersion:1};
 it('normalizes a legacy generated title without changing saved data',()=>{expect(displayReportTitle(report)).toBe('基隆市仁愛區忠二路44號 · 路面不平／破損');expect(report.title).toContain('Taiwan');});
 it('preserves a custom landmark title',()=>expect(displayReportTitle({...report,title:'騎樓入口請慢行'})).toBe('騎樓入口請慢行'));
});
