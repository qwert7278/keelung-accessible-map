import {readFileSync} from 'node:fs';
import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage, imageUploadFormat, MAX_IMAGE_SIZE, MAX_UPLOAD_SIZE, TARGET_UPLOAD_SIZE } from "./images";

afterEach(() => vi.unstubAllGlobals());

function encoderFixture(outputs: Array<Blob | null>, dimensions = { width: 3840, height: 2160 }) {
  const bitmap = { ...dimensions, close: vi.fn() };
  const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  const canvas = {
    width: 0, height: 0,
    getContext: () => context,
    toBlob: vi.fn((callback: (value: Blob | null) => void) => callback(outputs.shift() ?? null)),
  };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  vi.stubGlobal("document", { createElement: () => canvas });
  return { bitmap, context, canvas };
}

describe("照片上傳邊界", () => {
  it("拒絕 SVG，不交給解碼器", async () => {
    await expect(
      compressImage(
        new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("格式");
  });
  it("拒絕超過 20 MB 的原始照片", async () => {
    await expect(
      compressImage(
        new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "large.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).rejects.toThrow("檔案過大");
  });
  it.each(["photo.JPG", "photo.jpeg", "photo.png", "photo.webp"])("MIME 缺失時仍可依手機檔名辨認 %s", async name => {
    const output = new Blob(["webp"], { type: "image/webp" });
    encoderFixture([output]);
    const result = await compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], name, { type: "" }));
    expect(result).toBe(output);
  });
  it("重新繪製到 1920px，輸出 WebP 並關閉 bitmap", async () => {
    const output = new Blob(["webp"], { type: "image/webp" });
    const { canvas, context, bitmap } = encoderFixture([output]);
    const result = await compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], "photo.jpg", { type: "image/jpeg" }));
    expect(result).toBe(output);
    expect([canvas.width, canvas.height]).toEqual([1920, 1080]);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1920, 1080);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.8);
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(imageUploadFormat(result)).toEqual({ extension: "webp", contentType: "image/webp", format: "webp" });
  });
  it.each([null, new Blob([], {type:'image/webp'}), new Blob(['png'], {type:'image/png'})])('Safari 無法輸出 WebP 時使用同一 redraw 的 JPEG', async native => {
    const output=new Blob(['jpeg'],{type:'image/jpeg'});
    const {canvas,bitmap,context}=encoderFixture([native,output]);
    expect(await compressImage(new File([readFileSync('tests/fixtures/qa-photo.jpg')],'photo.jpg',{type:'image/jpeg'}))).toBe(output);
    expect(canvas.toBlob.mock.calls.map(call=>call.slice(1))).toEqual([['image/webp',0.8],['image/jpeg',0.82]]);
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(imageUploadFormat(output)).toEqual({extension:'jpg',contentType:'image/jpeg',format:'jpeg'});
  });
  it('JPEG fallback 逐步降低品質，達到目標停止',async()=>{
    const large=new Blob([new Uint8Array(TARGET_UPLOAD_SIZE+1)],{type:'image/jpeg'}),small=new Blob(['jpeg'],{type:'image/jpeg'});
    const {canvas}=encoderFixture([null,large,small]);
    expect(await compressImage(new File([readFileSync('tests/fixtures/qa-photo.jpg')],'photo.jpg',{type:'image/jpeg'}))).toBe(small);
    expect(canvas.toBlob.mock.calls.map(call=>call.slice(1))).toEqual([['image/webp',0.8],['image/jpeg',0.82],['image/jpeg',0.72]]);
  });
  it('兩種 encoder 都失敗時友善拒絕並釋放 bitmap',async()=>{
    const {bitmap}=encoderFixture([null,null]);
    await expect(compressImage(new File([readFileSync('tests/fixtures/qa-photo.jpg')],'photo.jpg',{type:'image/jpeg'}))).rejects.toThrow('重新拍照');
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(()=>imageUploadFormat(new Blob(['png'],{type:'image/png'}))).toThrow('處理');
  });
  it('原生 encoder 拋錯仍自動使用 JPEG',async()=>{
    const output=new Blob(['jpeg'],{type:'image/jpeg'}),{canvas}=encoderFixture([output]);
    canvas.toBlob.mockImplementationOnce(()=>{throw new Error('unsupported');});
    expect(await compressImage(new File([readFileSync('tests/fixtures/qa-photo.jpg')],'photo.jpg',{type:'image/jpeg'}))).toBe(output);
  });
  it("PNG 直式照片保持比例、不放大較小圖片", async () => {
    const output = new Blob(["webp"], { type: "image/webp" });
    const { canvas } = encoderFixture([output], { width: 2160, height: 3840 });
    await compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], "portrait.png", { type: "image/png" }));
    expect([canvas.width, canvas.height]).toEqual([1080, 1920]);
    const small = encoderFixture([output], { width: 480, height: 640 });
    await compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], "small.webp", { type: "image/webp" }));
    expect([small.canvas.width, small.canvas.height]).toEqual([480, 640]);
  });
  it("依大小降低品質，達到目標後停止", async () => {
    const large = new Blob([new Uint8Array(TARGET_UPLOAD_SIZE + 1)], { type: "image/webp" });
    const small = new Blob([new Uint8Array(TARGET_UPLOAD_SIZE)], { type: "image/webp" });
    const { canvas } = encoderFixture([large, small]);
    expect(await compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], "photo.jpg", { type: "image/jpeg" }))).toBe(small);
    expect(canvas.toBlob).toHaveBeenCalledTimes(2);
    expect(canvas.toBlob).toHaveBeenLastCalledWith(expect.any(Function), "image/webp", 0.7);
  });
  it("保留較小的輸出，目標不是硬上限", async () => {
    const output = new Blob([new Uint8Array(TARGET_UPLOAD_SIZE + 1)], { type: "image/webp" });
    const larger = new Blob([new Uint8Array(TARGET_UPLOAD_SIZE + 2)], { type: "image/webp" });
    encoderFixture([output, larger, larger]);
    expect(await compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], "photo.jpg", { type: "image/jpeg" }))).toBe(output);
  });
  it("壓縮後仍太大或空檔不能送到 Storage", async () => {
    const huge = new Blob([new Uint8Array(MAX_UPLOAD_SIZE + 1)], { type: "image/webp" });
    const { bitmap } = encoderFixture([huge, huge, huge, ...Array(4).fill(new Blob([new Uint8Array(MAX_UPLOAD_SIZE+1)],{type:"image/jpeg"}))]);
    await expect(compressImage(new File([readFileSync("tests/fixtures/qa-photo.jpg")], "photo.jpg", { type: "image/jpeg" }))).rejects.toThrow("仍過大");
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(() => imageUploadFormat(huge)).toThrow("大小異常");
    expect(()=>imageUploadFormat(new Blob([new Uint8Array(MAX_UPLOAD_SIZE+1)],{type:"image/jpeg"}))).toThrow("大小異常");
    expect(()=>imageUploadFormat(new Blob([],{type:"image/jpeg"}))).toThrow("大小異常");
    expect(() => imageUploadFormat(new Blob([], { type: "image/webp" }))).toThrow("大小異常");
  });
});
