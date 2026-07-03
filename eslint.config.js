import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.svelte-kit/**', '.wrangler/**', 'build/**', 'node_modules/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['src/**/*.{ts,svelte}', 'workers/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSNonNullExpression',
          message: 'Evite non-null assertions; trate valores opcionais explicitamente.'
        },
        {
          selector: "TSTypeAliasDeclaration[id.name='DisplayVotePosition']",
          message: 'Use DisplayVotePosition centralizado em $lib/domain.'
        },
        {
          selector: "TSInterfaceDeclaration[id.name='ParliamentarianVoteView']",
          message: 'Use ParliamentarianVoteView centralizado em $lib/domain.'
        }
      ]
    }
  }
];
