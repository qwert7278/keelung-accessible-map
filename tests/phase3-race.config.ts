import {defineConfig,mergeConfig} from 'vite';
import {resolve} from 'node:path';
import base from '../vite.config.ts';
// Only this explicit local test command substitutes the delayed resolver.
export default defineConfig(async env=>mergeConfig(typeof base==='function'?await base(env):base,{resolve:{alias:[{find:'../utils/locationSelection',replacement:resolve('tests/phase3-race-resolver.ts')}]}}));
