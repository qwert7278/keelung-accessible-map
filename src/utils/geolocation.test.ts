import {afterEach, describe, expect, it, vi} from 'vitest';
import {currentPosition, GPS_TIMEOUT_MS, gpsErrorMessage} from './geolocation';
function mockGPS() {
  let success!: PositionCallback, failure!: PositionErrorCallback;
  const getCurrentPosition = vi.fn((s: PositionCallback,f: PositionErrorCallback, options?: PositionOptions) => {void options;success=s;failure=f;});
  return {geo:{getCurrentPosition} as unknown as Geolocation, getCurrentPosition,
    succeed:(lat=25.12632,lng=121.74139)=>success({coords:{latitude:lat,longitude:lng,accuracy:20}} as GeolocationPosition),
    fail:(code:number)=>failure({code} as GeolocationPositionError)};
}
afterEach(()=>vi.useRealTimers());
describe('GPS acquisition',()=>{
  it('returns only actual GPS coordinates and requests a fresh fix with a longer timeout',async()=>{
    const gps=mockGPS(); const promise=currentPosition(gps.geo,new AbortController().signal);
    gps.succeed(); expect(await promise).toEqual({location:{lat:25.12632,lng:121.74139},accuracy:20});
    expect(gps.getCurrentPosition.mock.calls[0][2]).toEqual({timeout:20000,enableHighAccuracy:true,maximumAge:0});
  });
  it.each([1,2,3])('explains browser failure %s without returning default coordinates',async(code)=>{
    const gps=mockGPS();const promise=currentPosition(gps.geo,new AbortController().signal);
    const assertion=expect(promise).rejects.toThrow(gpsErrorMessage(code));gps.fail(code);await assertion;
  });
  it('bounds a browser that calls neither callback and ignores a late success',async()=>{
    vi.useFakeTimers();const gps=mockGPS();const promise=currentPosition(gps.geo,new AbortController().signal);
    const assertion=expect(promise).rejects.toThrow('定位逾時');await vi.advanceTimersByTimeAsync(GPS_TIMEOUT_MS);await assertion;
    gps.succeed();expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels pending GPS when another selection or unmount invalidates it',async()=>{
    vi.useFakeTimers();const gps=mockGPS();const controller=new AbortController();
    const promise=currentPosition(gps.geo,controller.signal);const assertion=expect(promise).rejects.toMatchObject({name:'AbortError'});
    controller.abort();gps.succeed();await assertion;expect(vi.getTimerCount()).toBe(0);
  });
  it('does not start a canceled request',async()=>{
    const gps=mockGPS();const controller=new AbortController();controller.abort();
    await expect(currentPosition(gps.geo,controller.signal)).rejects.toMatchObject({name:'AbortError'});expect(gps.getCurrentPosition).not.toHaveBeenCalled();
  });
  it.each([[NaN,121],[91,121],[25,181]])('rejects unusable GPS coordinates %s,%s',async(lat,lng)=>{
    const gps=mockGPS();const promise=currentPosition(gps.geo,new AbortController().signal);
    const assertion=expect(promise).rejects.toThrow('目前無法取得位置');gps.succeed(lat,lng);await assertion;
  });
  it('handles synchronous browser exceptions with a visible actionable error',async()=>{
    const geo={getCurrentPosition:()=>{throw new Error('blocked');}} as unknown as Geolocation;
    await expect(currentPosition(geo,new AbortController().signal)).rejects.toThrow('位置權限');
  });
});
