import {readFileSync} from 'node:fs';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {compressImage,imageDimensions,checkImageDimensions,MAX_UPLOAD_SIZE} from './images';
const heic=vi.hoisted(()=>({heicTo:vi.fn()}));
vi.mock('heic-to/csp',()=>heic);
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
describe('mobile image pipeline',()=>{
 it('reads HEIC/HEIF dimensions and lazily decodes when native HEIC fails',async()=>{
  const bitmap={width:800,height:400,close:vi.fn()},canvas={width:0,height:0,getContext:()=>({fillRect:vi.fn(),drawImage:vi.fn()}),toBlob:(cb:(b:Blob)=>void)=>cb(new Blob(['webp'],{type:'image/webp'}))};
  vi.stubGlobal('document',{createElement:()=>canvas});vi.stubGlobal('createImageBitmap',vi.fn().mockRejectedValue(new Error('unsupported')));heic.heicTo.mockResolvedValue(bitmap);
  for(const [name,type] of [['qa-photo.heic','image/heic'],['qa-photo.heif','']]){
   const file=new File([readFileSync('tests/fixtures/'+name)],name,{type});expect(await imageDimensions(file)).toEqual([800,400]);
   const output=await compressImage(file);expect(output.type).toBe('image/webp');expect(output.size).toBeLessThanOrEqual(MAX_UPLOAD_SIZE);
  }
  expect(heic.heicTo).toHaveBeenCalledTimes(2);expect(bitmap.close).toHaveBeenCalledTimes(2);
 });
 it('rejects oversized pixel headers before any decoder is invoked',async()=>{
  const bytes=new Uint8Array(24);bytes.set([137,80,78,71]);const view=new DataView(bytes.buffer);view.setUint32(16,8000);view.setUint32(20,6000);const decode=vi.fn();vi.stubGlobal('createImageBitmap',decode);
  await expect(compressImage(new File([bytes],'48mp.png',{type:'image/png'}))).rejects.toThrow('像素過大');expect(decode).not.toHaveBeenCalled();expect(()=>checkImageDimensions(0,800)).toThrow();
 });
 it('closes an unexpectedly oversized decoded bitmap and reports corrupt files',async()=>{
  const bitmap={width:8000,height:6000,close:vi.fn()};vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap));
  await expect(compressImage(new File([readFileSync('tests/fixtures/qa-photo.jpg')],'photo.jpg',{type:'image/jpeg'}))).rejects.toThrow('像素過大');expect(bitmap.close).toHaveBeenCalledOnce();await expect(imageDimensions(new Blob(['corrupt']))).rejects.toThrow('無法讀取');
 });
});
