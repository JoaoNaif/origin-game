import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

// Regra de dependência (CLAUDE.md): core -> nada; domain -> só core; infra -> domain e core;
// test -> core e domain. O motor de combate também não pode usar fontes não determinísticas.
const infraAndFrameworks = [
  { group: ['**/infra', '**/infra/**'], message: 'domain e core não importam infra.' },
  { group: ['@nestjs/*'], message: 'domain e core não importam Nest.' },
  { group: ['@prisma/*', 'prisma'], message: 'domain e core não importam Prisma.' },
]

const nonDeterministic = [
  {
    object: 'Math',
    property: 'random',
    message: 'Use a porta Rng (aleatoriedade vem da seed).',
  },
  {
    object: 'Date',
    property: 'now',
    message: 'Não use o relógio no domínio; passe o tempo como dado.',
  },
]

const noClock = {
  selector: "NewExpression[callee.name='Date'][arguments.length=0]",
  message: 'Não use o relógio no domínio; passe o tempo como dado.',
}

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'web'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...infraAndFrameworks,
            { group: ['**/domain', '**/domain/**'], message: 'core não importa domain.' },
          ],
        },
      ],
      'no-restricted-properties': ['error', ...nonDeterministic],
      'no-restricted-syntax': ['error', noClock],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: infraAndFrameworks }],
      'no-restricted-properties': ['error', ...nonDeterministic],
      'no-restricted-syntax': ['error', noClock],
    },
  }
)
