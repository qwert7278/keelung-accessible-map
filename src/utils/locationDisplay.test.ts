import {describe,it,expect} from 'vitest';
import {displayLocationAddress} from './locationDisplay';
describe('Taiwan address display',()=>{
 it('hides postcodes without stripping street or doorplate numbers',()=>expect(displayLocationAddress('62 忠四路, 仁愛區, 基隆市 20042, 臺灣','基隆市','仁愛區',false)).toBe('基隆市仁愛區忠四路62號'));
 it('keeps lane/alley/floor while hiding postal prefix',()=>expect(displayLocationAddress('200001 基隆市仁愛區愛三路49巷2弄4之1號3樓','基隆市','仁愛區',false)).toBe('基隆市仁愛區愛三路49巷2弄4之1號3樓'));
 it('removes alternate country spelling',()=>expect(displayLocationAddress('11號 南榮路, 仁愛區, 基隆市 20048, 台湾','基隆市','仁愛區',false)).toBe('基隆市仁愛區南榮路11號'));

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

describe('nationwide conservative address formatting',()=>{
 it.each([
 ['臺中市西區臺灣大道二段2號18樓, 403, Taiwan','臺中市','西區','臺中市西區臺灣大道二段2號18樓'],
 ['6之1 台南路, 東區, 臺南市 701, Taiwan','臺南市','東區','臺南市東區台南路6之1號'],
 ['高雄市三民區建工路12巷3弄4號之2, 807','高雄市','三民區','高雄市三民區建工路12巷3弄4號之2'],
 ['花蓮縣花蓮市中山路, 970, 台灣','花蓮縣','花蓮市','花蓮縣花蓮市中山路'],
 ['44 Zhong 2nd Rd, 200, Taiwan','基隆市','仁愛區','基隆市仁愛區44 Zhong 2nd Rd'],
 ['華國商務飯店, 愛三路49巷4號, 仁愛區, 基隆市, Taiwan','基隆市','仁愛區','基隆市仁愛區愛三路49巷4號 · 華國商務飯店'],
 ])('%s',(raw,city,district,expected)=>expect(displayLocationAddress(raw,city,district,false)).toBe(expected));
});
