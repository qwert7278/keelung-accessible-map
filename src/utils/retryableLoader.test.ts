import { describe, expect, it, vi } from 'vitest';
import { retryableLoader } from './retryableLoader';

describe('行政區資料載入重試', () => {
  it('短暫斷線後允許下一次成功載入，並快取成功結果', async () => {
    const regions = [{ district: '仁愛區' }];
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(regions);
    const cached = retryableLoader(load);
    await expect(cached('TW-KEE')).rejects.toThrow('offline');
    expect(await cached('TW-KEE')).toBe(regions);
    expect(await cached('TW-KEE')).toBe(regions);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('並行請求共用一次載入；失敗後所有呼叫者都能重新嘗試', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('chunk unavailable')).mockResolvedValue([]);
    const cached = retryableLoader(load);
    const first = cached('TW-TPE'), second = cached('TW-TPE');
    expect(first).toBe(second);
    const outcomes = await Promise.allSettled([first, second]);
    expect(outcomes.every(result => result.status === 'rejected')).toBe(true);
    expect(await cached('TW-TPE')).toEqual([]);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('單一縣市失敗不清除其他縣市成功的資料', async () => {
    const load = vi.fn(async (city: string) => {
      if (city === 'TW-KEE') throw new Error('offline');
      return [city];
    });
    const cached = retryableLoader(load);
    const taipei = await cached('TW-TPE');
    await expect(cached('TW-KEE')).rejects.toThrow('offline');
    expect(await cached('TW-TPE')).toBe(taipei);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
