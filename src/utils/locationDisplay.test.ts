import {describe,it,expect} from 'vitest';
import {displayLocationAddress} from './locationDisplay';
describe('Taiwan address display',()=>{
 it('orders locality road and house and removes country/duplicate locality',()=>expect(displayLocationAddress('4 吳興街, 信義區, 臺北市 110501, 臺灣','臺北市','信義區')).toBe('臺北市信義區吳興街4號 110501'));
 it('keeps alley numbers and postal information',()=>expect(displayLocationAddress('愛三路49巷4號, 仁愛區, 基隆市, 200-01, Taiwan','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷4號 200-01'));
 it('preserves an already ordered address',()=>expect(displayLocationAddress('基隆市仁愛區愛三路49巷4號','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷4號'));
 it('does not invent a street for a map point',()=>expect(displayLocationAddress('','基隆市','仁愛區')).toBe('基隆市仁愛區'));
});
