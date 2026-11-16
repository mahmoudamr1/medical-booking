import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

/*
 * Dependency direction (docs/architecture.md "Project structure"):
 *   app → features → components/{shared,ui,layout} → lib
 * - A feature is consumed only through its index (`@/features/<x>`); inside it, imports are relative
 *   and never climb above the feature root.
 * - components/ and lib/ never import features. src/i18n imports only feature dictionaries.
 * - Nothing imports route files.
 */
const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

const deepFeatureImport = {
  regex: '^@/features/[^/]+/',
  message: "Import from the feature's public surface '@/features/<x>' (relative paths inside it).",
};
const relativeIntoFeatures = {
  regex: '^(\\.\\./)+features/',
  message: "Import features as '@/features/<x>', not by relative path.",
};
const appImport = { regex: '^@/app(/|$)', message: 'Nothing imports route files.' };
const anyFeatureImport = {
  regex: '^@/features(/|$)',
  message: 'components/ and lib/ must not depend on features (pass feature UI in via props/slots).',
};

/** One override per nesting depth: a relative import may not leave its own feature folder. */
const MAX_FEATURE_DEPTH = 4;
const stayInsideFeature = Array.from({ length: MAX_FEATURE_DEPTH + 1 }, (_, depth) => ({
  files: [`src/features/*/${'*/'.repeat(depth)}*.{ts,tsx}`],
  rules: restrict(deepFeatureImport, appImport, {
    regex: `^(\\.\\./){${depth + 1},}`,
    message: "Relative imports stay inside the feature; use '@/features/<x>' for another feature.",
  }),
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Formatting is Prettier's job; disable stylistic ESLint rules that would conflict.
  prettier,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: restrict(deepFeatureImport, relativeIntoFeatures, appImport),
  },
  ...stayInsideFeature,
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: restrict(anyFeatureImport, relativeIntoFeatures, appImport),
  },
  {
    files: ['src/i18n/**/*.{ts,tsx}'],
    rules: restrict(
      {
        regex: '^@/features/[^/]+(/(?!i18n/).*)?$',
        message: "src/i18n imports only feature dictionaries ('@/features/<x>/i18n/*').",
      },
      relativeIntoFeatures,
      appImport,
    ),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
