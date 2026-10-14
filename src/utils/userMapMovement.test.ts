import {afterEach,describe,expect,it,vi} from 'vitest';
import {userMapMovement} from './userMapMovement';
const point={lat:25.15,lng:121.76};
afterEach(()=>vi.useRealTimers());
describe('user map browsing',()=>{
 it('ignores camera moves without a user drag',()=>{
  vi.useFakeTimers();const changed=vi.fn();const movement=userMapMovement(changed);
  movement.end(point,16);vi.runAllTimers();expect(changed).not.toHaveBeenCalled();
 });
 it('waits for the drag to settle and preserves its center and zoom',()=>{
  vi.useFakeTimers();const changed=vi.fn();const movement=userMapMovement(changed);
  movement.start();movement.end(point,15);vi.advanceTimersByTime(299);expect(changed).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);expect(changed).toHaveBeenCalledExactlyOnceWith(point,15);
 });
 it('cancels an earlier drag when the user moves again',()=>{
  vi.useFakeTimers();const changed=vi.fn();const started=vi.fn();const movement=userMapMovement(changed,started);
  movement.start();movement.end(point,16);vi.advanceTimersByTime(200);
  movement.start();movement.end({lat:25.16,lng:121.77},14);vi.runAllTimers();
  expect(changed).toHaveBeenCalledExactlyOnceWith({lat:25.16,lng:121.77},14);expect(started).toHaveBeenCalledTimes(2);
 });
 it('cancels queued movement on explicit camera changes or destruction',()=>{
  vi.useFakeTimers();const changed=vi.fn();const movement=userMapMovement(changed);
  movement.start();movement.end(point,16);movement.cancel();vi.runAllTimers();expect(changed).not.toHaveBeenCalled();
  movement.start();movement.cancel();movement.end(point,16);vi.runAllTimers();expect(changed).not.toHaveBeenCalled();
 });
});