import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'output/**', '.vercel/**', '.playwright-cli/**'] },
  { files:['supabase/functions/**/*.ts'], languageOptions:{globals:{Deno:'readonly'}} },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
)
