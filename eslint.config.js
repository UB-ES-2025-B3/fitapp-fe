import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'

export default [
  // 1. IGNORAR ARCHIVOS (Siempre lo primero)
  {
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/node_modules/**',
      '**/cypress/**',
      '**/*.spec.js',
      '**/tests/**'
    ],
  },

  // 2. CONFIGURACIONES BASE (Cargarlas ANTES de tus reglas)
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  skipFormatting,

  // 3. TUS REGLAS PERSONALIZADAS (Para sobrescribir lo anterior)
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        cy: 'readonly',
        Cypress: 'readonly'
      },
    },
    rules: {
      // Desactiva error de nombres simples en componentes
      'vue/multi-word-component-names': 'off',

      // Acepta variables no usadas si empiezan con _ (ej: _e, _args)
      // Y trata el resto como advertencia (warn) en lugar de error rojo
      'no-unused-vars': ['warn', { 
          'varsIgnorePattern': '^_', 
          'argsIgnorePattern': '^_' 
      }],

      // Permite console.log
      'no-console': 'off',
      'no-debugger': 'off'
    }
  }
]