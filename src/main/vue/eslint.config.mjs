/*
 * Copyright 2026 DENTSU SOKEN INC. All Rights Reserved.
 */
import js from '@eslint/js'
import prettierConfig from '@vue/eslint-config-prettier'
import vueTsEsLintConfig from '@vue/eslint-config-typescript'
import importPlugin from 'eslint-plugin-import'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  ...pluginVue.configs['flat/recommended'],
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  ...vueTsEsLintConfig(),
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2015,
      },
    },

    settings: {
      'import/resolver': [
        {
          typescript: true,
          node: true,
        },
      ],
    },

    rules: {
      'vue/no-undef-components': [
        'error',
        {
          // V.+ = Vuetify, M.+ = iPLAss MDC, router-* = vue-router グローバル登録
          ignorePatterns: ['V.+', 'M.+', 'router-link', 'router-view'],
        },
      ],
      // 単語コンポーネントだが HTML 要素と衝突しない既存 UI 部品は許容
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: ['Pagination', 'Toast'],
        },
      ],
      // _ 接頭辞は「意図的に未使用」の慣用シグナル（例: Vue plugin install(_app)）
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]
