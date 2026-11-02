import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/** A regra do ADR 0008 precisa barrar de verdade: testa o próprio ESLint. */
async function restricted(code: string, filePath: string): Promise<boolean> {
  const eslint = new ESLint()
  const [result] = await eslint.lintText(code, { filePath })
  return Boolean(result?.messages.some((m) => m.ruleId === 'no-restricted-imports'))
}

describe('fronteiras do frontend', () => {
  it('barra import interno de outra feature', async () => {
    expect(
      await restricted(
        "import { login } from '@/features/auth/services/auth'\nexport { login }\n",
        'src/app/page.tsx',
      ),
    ).toBe(true)
  })

  it('barra caminho relativo para outra feature', async () => {
    expect(
      await restricted(
        "import { login } from '../../auth/services/auth'\nexport { login }\n",
        'src/features/users/components/x.ts',
      ),
    ).toBe(true)
  })

  it('barra features em components e lib', async () => {
    expect(
      await restricted(
        "import { homeFor } from '@/features/shared'\nexport { homeFor }\n",
        'src/components/layout/x.ts',
      ),
    ).toBe(true)
  })

  it('permite o index público', async () => {
    expect(
      await restricted(
        "import { homeFor } from '@/features/shared'\nexport { homeFor }\n",
        'src/app/x.ts',
      ),
    ).toBe(false)
  })
})
