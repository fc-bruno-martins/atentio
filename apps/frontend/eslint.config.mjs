import next from 'eslint-config-next'

const internalOfFeature = {
  group: ['@/features/*/*'],
  message: 'Importe só de "@/features/<feature>" (ADR 0008).',
}

const config = [
  ...next,
  { ignores: ['.next', 'node_modules', 'next-env.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [internalOfFeature] }] },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            internalOfFeature,
            {
              group: ['../../*'],
              message: 'Outra feature só pelo index: "@/features/<feature>" (ADR 0008).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/features', '@/features/*'], message: 'components/ e lib/ não importam features/ (ADR 0008).' },
          ],
        },
      ],
    },
  },
]

export default config
