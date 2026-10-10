import {describe,it,expect} from 'vitest';
import {displayLocationAddress} from './locationDisplay';
describe('Taiwan address display',()=>{
 it('orders locality road and house and removes country/duplicate locality',()=>expect(displayLocationAddress('4 吳興街, 信義區, 臺北市 110501, 臺灣','臺北市','信義區')).toBe('臺北市信義區吳興街4號 110501'));
 it('keeps alley numbers and postal information',()=>expect(displayLocationAddress('愛三路49巷4號, 仁愛區, 基隆市, 200-01, Taiwan','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷4號 200-01'));
 it('preserves an already ordered address',()=>expect(displayLocationAddress('基隆市仁愛區愛三路49巷4號','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷4號'));
 it('does not invent a street for a map point',()=>expect(displayLocationAddress('','基隆市','仁愛區')).toBe('基隆市仁愛區'));
 it('keeps nested lane/alley/doorplate/floor',()=>expect(displayLocationAddress('基隆市仁愛區愛三路49巷2弄4之1號3樓','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷2弄4之1號3樓'));
 // NTU official address: https://www.ntu.edu.tw/ (106319 臺北市大安區羅斯福路四段1號).
 it('moves a leading six-digit postal code after the full NTU address',()=>expect(displayLocationAddress('106319 臺北市大安區羅斯福路四段1號','臺北市','大安區')).toBe('臺北市大安區羅斯福路四段1號 106319'));
 it('moves a separate leading postcode after the street',()=>expect(displayLocationAddress('200, 愛三路49巷4號, 仁愛區, 基隆市, Taiwan','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷4號 200'));
 it('preserves suffix doorplate notation',()=>expect(displayLocationAddress('4號之1 吳興街, 信義區, 臺北市','臺北市','信義區')).toBe('臺北市信義區吳興街4號之1'));
 it('does not strip district names inside landmark names',()=>expect(displayLocationAddress('中正區公所, 臺北市中正區忠孝東路一段108號, 臺灣','臺北市','中正區')).toBe('臺北市中正區忠孝東路一段108號 · 中正區公所'));
 it('does not change the spelling of a business name',()=>expect(displayLocationAddress('台灣大哥大, 臺北市信義區吳興街4號, 臺灣','臺北市','信義區')).toBe('臺北市信義區吳興街4號 · 台灣大哥大'));
 it('does not mistake a shop name containing 路 for a street',()=>expect(displayLocationAddress('路易莎咖啡, 基隆市仁愛區愛三路49巷4號','基隆市','仁愛區')).toBe('基隆市仁愛區愛三路49巷4號 · 路易莎咖啡'));
});
